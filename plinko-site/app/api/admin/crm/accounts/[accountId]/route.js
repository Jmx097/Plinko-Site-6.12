import { auth, currentUser } from '@clerk/nextjs/server';

import { addCrmAccountNote, addCrmFollowUpTask, completeCrmFollowUpTask, getCrmAccountWorkspace } from '../../../../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../../../../lib/plinko-pocket-admin.mjs';

async function requireStaffAccess() {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await currentUser();
  try {
    requireAdminEmail(user);
    return true;
  } catch {
    return false;
  }
}

export async function GET(_request, { params }) {
  const allowed = await requireStaffAccess();
  if (!allowed) return Response.json({ error: 'Staff access required' }, { status: 403 });
  const { accountId } = await params;
  try {
    return Response.json(await getCrmAccountWorkspace(accountId), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to load account workspace' }, { status: 502 });
  }
}

export async function POST(request, { params }) {
  const allowed = await requireStaffAccess();
  if (!allowed) return Response.json({ error: 'Staff access required' }, { status: 403 });
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'JSON note payload is required' }, { status: 400 });
  }
  const { accountId } = await params;
  try {
    if (payload?.intent === 'task') {
      return Response.json(await addCrmFollowUpTask(accountId, { title: payload?.title, due_at: payload?.due_at }), { status: 201, headers: { 'cache-control': 'no-store' } });
    }
    if (payload?.intent === 'complete_task') {
      return Response.json(await completeCrmFollowUpTask(accountId, payload?.task_id), { headers: { 'cache-control': 'no-store' } });
    }
    if (payload?.intent && payload.intent !== 'note') {
      return Response.json({ error: 'Unsupported CRM workspace action' }, { status: 400 });
    }
    return Response.json(await addCrmAccountNote(accountId, payload?.note), { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to update account workspace' }, { status: 400 });
  }
}
