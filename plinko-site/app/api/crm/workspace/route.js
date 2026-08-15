import { auth, currentUser } from '@clerk/nextjs/server';
import { crmWorkspaceAction } from '../../../../lib/crm-api.mjs';
import { requireCrmEqualAdminEmail } from '../../../../lib/crm-equal-admin.mjs';

async function verifiedCrmAdminEmail() {
  const { userId } = await auth();
  if (!userId) return null;
  try { return requireCrmEqualAdminEmail(await currentUser()); } catch { return null; }
}

export async function GET() {
  const actorEmail = await verifiedCrmAdminEmail();
  if (!actorEmail) return Response.json({ error: 'Staff access required' }, { status: 403 });
  try {
    const data = await crmWorkspaceAction('overview', {}, actorEmail);
    return Response.json(data, { headers: { 'cache-control': 'no-store' } });
  } catch { return Response.json({ error: 'CRM unavailable' }, { status: 502 }); }
}

export async function POST(request) {
  const actorEmail = await verifiedCrmAdminEmail();
  if (!actorEmail) return Response.json({ error: 'Staff access required' }, { status: 403 });
  let command;
  try { command = await request.json(); } catch { return Response.json({ error: 'JSON command required' }, { status: 400 }); }
  if (!command || typeof command.action !== 'string' || !command.payload || typeof command.payload !== 'object' || Array.isArray(command.payload)) return Response.json({ error: 'Invalid CRM command' }, { status: 400 });
  try {
    return Response.json(await crmWorkspaceAction(command.action, command.payload, actorEmail), { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    const status = error.message === 'Unsupported CRM action' ? 400 : 502;
    return Response.json({ error: status === 400 ? error.message : 'CRM command could not be completed' }, { status });
  }
}
