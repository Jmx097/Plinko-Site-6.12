import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { requireCrmWorkspaceAccess } from '../../lib/crm-equal-admin.mjs';
import { crmPageAuthorization } from '../../lib/crm-route-access-core.mjs';
import CrmWorkspace from './CrmWorkspace.jsx';

export const dynamic = 'force-dynamic';
export default async function CrmPage() {
  const { userId } = await auth();
  const authorization = await crmPageAuthorization({ user: userId ? await currentUser() : null, userId, requireAccess: requireCrmWorkspaceAccess });
  if (!authorization.allowed) redirect(authorization.redirectTo);
  return <CrmWorkspace />;
}
