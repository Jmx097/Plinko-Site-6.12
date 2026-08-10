import { auth, currentUser } from '@clerk/nextjs/server';

import { addCrmAccountNote, getCrmAccountWorkspace } from '../../../../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../../../../lib/plinko-pocket-admin.mjs';

async function requireStaffActor() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  try {
    return `staff:${requireAdminEmail(user)}`;
  } catch {
    return null;
  }
}

export async function GET(_request, { params }) {
  const actor = await requireStaffActor();
  if (!actor) return Response.json({ error: 'Staff access required' }, { status: 403 });
  const { accountId } = await params;
  try {
    return Response.json(await getCrmAccountWorkspace(accountId), { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to load account workspace' }, { status: 502 });
  }
}

export async function POST(request, { params }) {
  const actor = await requireStaffActor();
  if (!actor) return Response.json({ error: 'Staff access required' }, { status: 403 });
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'JSON note payload is required' }, { status: 400 });
  }
  const { accountId } = await params;
  try {
    return Response.json(await addCrmAccountNote(accountId, payload?.note, actor), { status: 201, headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to save note' }, { status: 400 });
  }
}
