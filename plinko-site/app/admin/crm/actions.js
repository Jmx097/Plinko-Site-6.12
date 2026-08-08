'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { decideCrmApproval } from '../../../lib/crm-api.mjs';
import { requireAdminEmail } from '../../../lib/plinko-pocket-admin.mjs';

async function verifiedStaff() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId) throw new Error('Authenticated staff session required');
  return requireAdminEmail(user);
}

export async function decideCrmApprovalAction(accountId, formData) {
  await verifiedStaff();
  const gate = String(formData.get('gate') || '');
  const decision = String(formData.get('decision') || '');
  if (!['account', 'contact', 'draft', 'send'].includes(gate) || !['approved', 'rejected'].includes(decision)) {
    throw new Error('Invalid CRM approval decision');
  }
  await decideCrmApproval({ accountId, gate, decision });
  revalidatePath('/admin/crm');
}
