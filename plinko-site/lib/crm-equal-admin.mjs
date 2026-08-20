import 'server-only';

import { isCrmEqualAdminEmail, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';
import { getMemberRoleAccess } from './pocket-roles.mjs';
export { isCrmEqualAdminEmail, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';

/**
 * CRM authority is role-based. The email allowlists remain a temporary safe
 * fallback for existing operators until their Sales role is assigned.
 */
export async function hasCrmWorkspaceAccess(user, userId, environment = process.env) {
  const email = verifiedPrimaryEmail(user);
  if (email && isCrmEqualAdminEmail(email, environment)) return true;
  if (!userId) return false;
  try {
    const access = await getMemberRoleAccess({ userId, environment });
    return access.capabilities.includes('crm.workspace');
  } catch {
    return false;
  }
}

/** Returns a verified Clerk email only when the user may work in CRM. */
export async function requireCrmWorkspaceAccess(user, userId, environment = process.env) {
  const email = verifiedPrimaryEmail(user);
  if (!email || !(await hasCrmWorkspaceAccess(user, userId, environment))) throw new Error('CRM workspace access required');
  return email;
}

/** @deprecated use requireCrmWorkspaceAccess with the verified Clerk subject. */
export function requireCrmEqualAdminEmail(user, environment = process.env) {
  const email = verifiedPrimaryEmail(user);
  if (!email || !isCrmEqualAdminEmail(email, environment)) throw new Error('Staff access required');
  return email;
}
