import { auth, currentUser } from '@clerk/nextjs/server';
import { executeCopilotReadInternal } from '../../../lib/copilot-bff.mjs';
import { requireCopilotWorkspaceAccess } from '../../../lib/copilot-access.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Copilot access required' }, { status: 403 });
  try {
    const actor = await requireCopilotWorkspaceAccess(await currentUser(), userId);
    const command = await request.json();
    const response = await executeCopilotReadInternal({ actorEmail: actor.email, command });
    return Response.json(response, { headers: { 'cache-control': 'no-store' } });
  } catch {
    // Do not expose role, tenant, CRM, persistence, or handle-resolution detail.
    return Response.json({ error: 'Copilot request is unavailable' }, { status: 403 });
  }
}

export async function GET() {
  return Response.json({ error: 'Copilot requests require POST' }, { status: 405, headers: { Allow: 'POST' } });
}
