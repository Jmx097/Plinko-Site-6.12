import { createHash } from 'node:crypto';
import { auth, currentUser } from '@clerk/nextjs/server';
import { requireCopilotWorkspaceAccess } from '../../../../lib/copilot-access.mjs';
import { crmWorkspaceAction } from '../../../../lib/crm-api.mjs';
import { COPILOT_POLICY_VERSION } from '../../../../lib/copilot-policy-core.mjs';
import { createPocketHermesAguiResponse, getPocketHermesConfig } from '../../../../lib/copilot-hermes-agui.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Copilot access required' }, { status: 403 });
  try {
    const actor = await requireCopilotWorkspaceAccess(await currentUser(), userId);
    const input = await request.json();
    const directory = await crmWorkspaceAction('list_accounts', { limit: 50 }, actor.email);
    const crmGrounding = {
      fetchedAt: directory.freshness?.checked_at || new Date().toISOString(),
      accounts: (directory.accounts || []).slice(0, 12).map((account) => ({
        name: account.display_name || account.displayName || 'Unnamed account',
        status: account.account_approval || account.status || 'unknown',
        nextAction: account.next_action?.label || account.nextAction || 'Open account',
        updatedAt: account.updated_at || account.updatedAt || account.created_at || null,
      })),
      boundaries: {
        weeklyNewAccountCap: 5,
        contactsPerAccount: 1,
        sequence: ['email day 1', 'manual call day 2', 'email day 4', 'manual call day 7'],
        externalExecutionRequiresSeparateApproval: true,
      },
    };
    return createPocketHermesAguiResponse({
      input,
      userId,
      tenantKey: `plinko-internal-${createHash('sha256').update(actor.email).digest('hex').slice(0, 24)}`,
      crmGrounding,
      policyVersion: COPILOT_POLICY_VERSION,
      config: getPocketHermesConfig(),
    });
  } catch {
    return Response.json({ error: 'Pocket Hermes chat is unavailable' }, { status: 403 });
  }
}

export async function GET() {
  return Response.json({ error: 'AG-UI requests require POST' }, { status: 405, headers: { Allow: 'POST' } });
}
