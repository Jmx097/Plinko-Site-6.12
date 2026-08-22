import 'server-only';

import { COPILOT_CAPABILITY, COPILOT_PARENT_CAPABILITY } from './copilot-policy-core.mjs';
import { isCrmEqualAdminEmail, verifiedPrimaryEmail } from './crm-equal-admin-core.mjs';
import { getMemberRoleAccess } from './pocket-roles.mjs';

/** Copilot uses role access when available and an existing equal-admin fallback for the internal launch. */
export async function requireCopilotWorkspaceAccess(user, userId, environment = process.env) {
  const email = verifiedPrimaryEmail(user);
  if (!userId || !email) throw new Error('Copilot workspace access required');
  try {
    const access = await getMemberRoleAccess({ userId, environment });
    if (access.roles.includes('sales') && access.capabilities.includes(COPILOT_PARENT_CAPABILITY) && access.capabilities.includes(COPILOT_CAPABILITY)) {
      return { userId, email, roles: access.roles, capabilities: access.capabilities };
    }
  } catch {
    // The role tables are an additive future cutover. Existing equal admins keep
    // a fail-closed, server-derived internal path while that migration is pending.
  }
  if (isCrmEqualAdminEmail(email, environment)) {
    return { userId, email, roles: ['sales'], capabilities: [COPILOT_PARENT_CAPABILITY, COPILOT_CAPABILITY], transitionalAllowlist: true };
  }
  throw new Error('Copilot workspace access required');
}
