import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { crmActorSigningHeaders } from '../lib/crm-actor-signing.mjs';

test('CRM POST actor headers are HMAC SHA-256 millisecond-timestamp.actor and omit raw-email header', () => {
  const headers = crmActorSigningHeaders('Admin@Example.com', 'secret', 1700000000000);
  assert.deepEqual(headers, { 'X-CRM-Actor': 'admin@example.com', 'X-CRM-Actor-Timestamp': '1700000000000', 'X-CRM-Actor-Signature': createHmac('sha256', 'secret').update('1700000000000.admin@example.com').digest('hex') });
  assert.equal(Object.keys(headers).some((key) => key.toLowerCase() === 'x-crm-actor-email'), false);
});
test('signing fails closed when the secret or actor is absent', () => {
  assert.throws(() => crmActorSigningHeaders('admin@example.com', '', 7), /not configured/);
  assert.throws(() => crmActorSigningHeaders('', 'secret', 7), /not configured/);
});
