import 'server-only';

import { getPlinkoCoreConfig } from './plinko-core-config.mjs';
import { getMemberRoleAccessWithConfig, setMemberRoleWithConfig } from './pocket-roles-core.mjs';

export function getMemberRoleAccess({ userId, environment = process.env, fetchImpl = fetch } = {}) {
  return getMemberRoleAccessWithConfig({ userId, config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function setMemberRole({ userId, roleKey, enabled, actorEmail, environment = process.env, fetchImpl = fetch } = {}) {
  return setMemberRoleWithConfig({ userId, roleKey, enabled, actorEmail, config: getPlinkoCoreConfig(environment), fetchImpl });
}
