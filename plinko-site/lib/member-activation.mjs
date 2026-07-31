import 'server-only';

import { getPlinkoCoreConfig } from './plinko-core-config.mjs';
import { activateMemberWithConfig, getMemberOverviewWithConfig } from './member-activation-core.mjs';

/**
 * Server-only boundary: configuration and service-role credentials never cross
 * into client code. userId must come from Clerk's verified server session.
 */
export function activateMember({ userId, environment = process.env, fetchImpl = fetch } = {}) {
  return activateMemberWithConfig({
    userId,
    config: getPlinkoCoreConfig(environment),
    fetchImpl,
  });
}

export function getMemberOverview({ userId, environment = process.env, fetchImpl = fetch } = {}) {
  return getMemberOverviewWithConfig({
    userId,
    config: getPlinkoCoreConfig(environment),
    fetchImpl,
  });
}
