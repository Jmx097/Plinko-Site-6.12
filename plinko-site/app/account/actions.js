'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

import { createSupportRequest } from '../../lib/member-dashboard.mjs';

export async function submitSupportRequest(formData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Authenticated member session required');
  await createSupportRequest({
    userId,
    subject: formData.get('subject'),
    message: formData.get('message'),
  });
  revalidatePath('/account');
}
