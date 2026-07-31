import 'server-only';

export function getPrimaryEmail(user) {
  return user?.emailAddresses?.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress
    || user?.emailAddresses?.[0]?.emailAddress
    || undefined;
}

export function isAdminEmail(email, environment = process.env) {
  if (typeof email !== 'string') return false;
  const allowlist = String(environment.PLINKO_POCKET_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.trim().toLowerCase());
}

export function requireAdminEmail(user, environment = process.env) {
  const email = getPrimaryEmail(user);
  if (!isAdminEmail(email, environment)) throw new Error('Staff access required');
  return email.trim().toLowerCase();
}
