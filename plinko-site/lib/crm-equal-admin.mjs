import 'server-only';

import { hasCrmWorkspaceAccessWithRoleAccess, isCrmEqualAdminEmail, requireCrmWorkspaceAccessWithRoleAccess, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';
import { getMemberRoleAccess } from './pocket-roles.mjs';
export { isCrmEqualAdminEmail, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';

/**
 * CRM authority is role-based. The email allowlists remain a temporary safe
 * fallback for existing operators until their Sales role is assigned.
 */
export async function hasCrmWorkspaceAccess(user, userId, environment = process.env) {
  try {
    return await hasCrmWorkspaceAccessWithRoleAccess(user, userId, environment, (subject) => getMemberRoleAccess({ userId: subject, environment }));
  } catch {
    return false;
  }
}

/** Returns a verified Clerk email only when the user may work in CRM. */
export async function requireCrmWorkspaceAccess(user, userId, environment = process.env) {
  return requireCrmWorkspaceAccessWithRoleAccess(user, userId, environment, (subject) => getMemberRoleAccess({ userId: subject, environment }));
}

/** @deprecated use requireCrmWorkspaceAccess with the verified Clerk subject. */
export function requireCrmEqualAdminEmail(user, environment = process.env) {
  const email = verifiedPrimaryEmail(user);
  if (!email || !isCrmEqualAdminEmail(email, environment)) throw new Error('Staff access required');
  return email;
}
