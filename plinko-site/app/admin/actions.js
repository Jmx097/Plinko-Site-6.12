'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { setMemberModuleGrant, setSupportRequestStatus } from '../../lib/member-dashboard.mjs';
import { requireAdminEmail } from '../../lib/plinko-pocket-admin.mjs';

async function verifiedStaffEmail() {
  const { userId } = await auth();
  const user = await currentUser();
  if (!userId) throw new Error('Authenticated staff session required');
  return requireAdminEmail(user);
}

export async function updateGrantForMember(userId, moduleKey, formData) {
  const actorEmail = await verifiedStaffEmail();
  await setMemberModuleGrant({ userId, moduleKey, enabled: formData.get('enabled') === 'true', actorEmail });
  revalidatePath('/admin');
  revalidatePath('/account');
}

export async function updateSupportStatus(requestId, formData) {
  await verifiedStaffEmail();
  await setSupportRequestStatus({ requestId, status: formData.get('status') });
  revalidatePath('/admin');
}
