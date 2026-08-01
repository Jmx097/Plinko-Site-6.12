import 'server-only';

import { getPlinkoCoreConfig } from './plinko-core-config.mjs';
import { captureWaitlistEntryWithConfig, getWaitlistEntriesWithConfig, setWaitlistStatusWithConfig } from './waitlist-core.mjs';

export function captureWaitlistEntry({ submission, environment = process.env, fetchImpl = fetch } = {}) {
  return captureWaitlistEntryWithConfig({ submission, config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function getWaitlistEntries({ environment = process.env, fetchImpl = fetch } = {}) {
  return getWaitlistEntriesWithConfig({ config: getPlinkoCoreConfig(environment), fetchImpl });
}

export function setWaitlistStatus({ entryId, status, actorEmail, environment = process.env, fetchImpl = fetch } = {}) {
  return setWaitlistStatusWithConfig({ entryId, status, actorEmail, config: getPlinkoCoreConfig(environment), fetchImpl });
}
