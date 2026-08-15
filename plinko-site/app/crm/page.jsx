import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { requireCrmEqualAdminEmail } from '../../lib/crm-equal-admin.mjs';
import CrmWorkspace from './CrmWorkspace.jsx';

export const dynamic = 'force-dynamic';
export default async function CrmPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  try { requireCrmEqualAdminEmail(await currentUser()); } catch { redirect('/account'); }
  return <CrmWorkspace />;
}
