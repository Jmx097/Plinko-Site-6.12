import 'server-only';
import { isCrmEqualAdminEmail, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';
export { isCrmEqualAdminEmail, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';

/** Returns a Clerk-derived, verified email only when it has CRM admin access. */
export function requireCrmEqualAdminEmail(user, environment = process.env) {
  const email = verifiedPrimaryEmail(user);
  if (!email || !isCrmEqualAdminEmail(email, environment)) throw new Error('Staff access required');
  return email;
}
