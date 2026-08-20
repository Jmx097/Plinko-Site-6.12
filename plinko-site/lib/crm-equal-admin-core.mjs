export function verifiedPrimaryEmail(user) {
  const address = user?.emailAddresses?.find((item) => item.id === user.primaryEmailAddressId) || user?.emailAddresses?.[0];
  if (!address?.emailAddress || address.verification?.status !== 'verified') return undefined;
  return address.emailAddress.trim().toLowerCase();
}
export function isCrmEqualAdminEmail(email, environment = process.env) {
  if (typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const equalAdmins = String(environment.PLINKO_CRM_EQUAL_ADMIN_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  const existingAdmins = String(environment.PLINKO_POCKET_ADMIN_EMAILS || '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  return existingAdmins.includes(normalized) || equalAdmins.includes(normalized);
}

export async function hasCrmWorkspaceAccessWithRoleAccess(user, userId, environment = process.env, getRoleAccess) {
  const email = verifiedPrimaryEmail(user);
  if (!email || !userId || typeof getRoleAccess !== 'function') return false;
  try {
    const access = await getRoleAccess(userId);
    if (access?.capabilities?.includes('crm.workspace')) return true;
    return isCrmEqualAdminEmail(email, environment) && access?.hasSalesRoleAssignment === false;
  } catch {
    return false;
  }
}

export async function requireCrmWorkspaceAccessWithRoleAccess(user, userId, environment = process.env, getRoleAccess) {
  const email = verifiedPrimaryEmail(user);
  if (!email || !(await hasCrmWorkspaceAccessWithRoleAccess(user, userId, environment, getRoleAccess))) throw new Error('CRM workspace access required');
  return email;
}
