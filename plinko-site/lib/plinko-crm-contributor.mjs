import 'server-only';

import { getPrimaryEmail, isAdminEmail } from './plinko-pocket-admin.mjs';

function contributorEmails(environment = process.env) {
  return String(environment.PLINKO_CRM_CONTRIBUTOR_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isContributorEmail(email, environment = process.env) {
  if (typeof email !== 'string' || !email.trim()) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return isAdminEmail(normalizedEmail, environment) || contributorEmails(environment).includes(normalizedEmail);
}

export function requireContributorEmail(user, environment = process.env) {
  const email = getPrimaryEmail(user);
  if (!isContributorEmail(email, environment)) throw new Error('CRM contributor access required');
  return email.trim().toLowerCase();
}
