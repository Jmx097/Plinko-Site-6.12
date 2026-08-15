import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import { crmActorSigningHeaders } from '../lib/crm-actor-signing.mjs';

const require = createRequire(import.meta.url);
const { verifyActorAssertion } = require('/root/workspace/crm-equal-admin-service/src/crm/actor-assertion.js');

test('portal actor assertion is accepted by the CRM service millisecond contract', () => {
  const now = 1786806000000;
  const headers = crmActorSigningHeaders('KevanDMC@gmail.com', 'shared-secret', now);
  assert.equal(verifyActorAssertion({ headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])) }, 'shared-secret', now), 'kevandmc@gmail.com');
});

test('the CRM service rejects the retired second-based portal timestamp', () => {
  const now = 1786806000000;
  const headers = crmActorSigningHeaders('kevandmc@gmail.com', 'shared-secret', 1786806000);
  assert.equal(verifyActorAssertion({ headers: Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])) }, 'shared-secret', now), undefined);
});
