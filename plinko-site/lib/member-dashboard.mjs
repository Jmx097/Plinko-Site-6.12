import 'server-only';

import { getPlinkoCoreConfig } from './plinko-core-config.mjs';
import {
  createSupportRequestWithConfig,
  getAdminControlPlaneWithConfig,
  getMemberDashboardWithConfig,
  setMemberModuleGrantWithConfig,
  setSupportRequestStatusWithConfig,
} from './member-dashboard-core.mjs';

// This adapter is the only dashboard path that supplies the service-role key.
export function getMemberDashboard({ userId, environment = process.env, fetchImpl = fetch } = {}) {
  return getMemberDashboardWithConfig({ userId, config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function createSupportRequest({ userId, subject, message, environment = process.env, fetchImpl = fetch } = {}) {
  return createSupportRequestWithConfig({ userId, subject, message, config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function getAdminControlPlane({ environment = process.env, fetchImpl = fetch } = {}) {
  return getAdminControlPlaneWithConfig({ config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function setMemberModuleGrant({ userId, moduleKey, enabled, actorEmail, environment = process.env, fetchImpl = fetch } = {}) {
  return setMemberModuleGrantWithConfig({ userId, moduleKey, enabled, actorEmail, config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function setSupportRequestStatus({ requestId, status, environment = process.env, fetchImpl = fetch } = {}) {
  return setSupportRequestStatusWithConfig({ requestId, status, config: getPlinkoCoreConfig(environment), fetchImpl });
}
