import assert from 'node:assert/strict';
import test from 'node:test';

import { captureWaitlistEntryWithConfig, normalizeWaitlistSubmission } from '../lib/waitlist-core.mjs';

const config = { url: 'https://core.example.test', serviceRoleKey: 'service-role' };
const response = (status, body = null) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('normalizes and bounds a consented waitlist submission', () => {
  assert.deepEqual(normalizeWaitlistSubmission({ email: '  JON@Example.COM ', firstName: ' Jon ', accountType: 'business', company: ' Plinko Solutions ', desiredOutcome: 'both', source: ' homepage ', referralCode: ' ABC-123 ', productUpdatesConsent: true, termsVersion: '2026-08-01' }),
    { email: 'jon@example.com', firstName: 'Jon', accountType: 'business', company: 'Plinko Solutions', desiredOutcome: 'both', source: 'homepage', referralCode: 'abc-123', productUpdatesConsent: true, termsVersion: '2026-08-01' });
});

test('rejects malformed fields, missing consent, bot honeypot, and attribution poisoning', () => {
  for (const input of [
    { email: 'bad', accountType: 'individual', desiredOutcome: 'learn', productUpdatesConsent: true, termsVersion: 'v1' },
    { email: 'ok@example.com', accountType: 'team', desiredOutcome: 'learn', productUpdatesConsent: true, termsVersion: 'v1' },
    { email: 'ok@example.com', accountType: 'individual', desiredOutcome: 'magic', productUpdatesConsent: true, termsVersion: 'v1' },
    { email: 'ok@example.com', accountType: 'individual', desiredOutcome: 'learn', productUpdatesConsent: false, termsVersion: 'v1' },
    { email: 'ok@example.com', accountType: 'individual', desiredOutcome: 'learn', productUpdatesConsent: true, website: 'spam', termsVersion: 'v1' },
    { email: 'ok@example.com', accountType: 'individual', desiredOutcome: 'learn', productUpdatesConsent: true, source: 'bad source!', termsVersion: 'v1' },
  ]) assert.throws(() => normalizeWaitlistSubmission(input));
});

test('captures through one transactional RPC and returns no lifecycle state', async () => {
  let call;
  const fetchImpl = async (url, options) => { call = { url, options }; return response(200, [{ id: '11111111-1111-4111-8111-111111111111' }]); };
  const result = await captureWaitlistEntryWithConfig({ submission: { email: 'JON@example.com', firstName: 'Jon', accountType: 'individual', desiredOutcome: 'blueprints', productUpdatesConsent: true, termsVersion: '2026-08-01' }, config, fetchImpl });
  assert.deepEqual(result, { id: '11111111-1111-4111-8111-111111111111' });
  assert.match(call.url, /rpc\/capture_waitlist_entry$/);
  const body = JSON.parse(call.options.body);
  assert.equal(body.p_email, 'jon@example.com');
  assert.equal(body.p_source, 'portal_waitlist');
  assert.equal(Object.hasOwn(result, 'status'), false);
});

test('fails closed when Core rejects the atomic capture', async () => {
  await assert.rejects(() => captureWaitlistEntryWithConfig({ submission: { email: 'jon@example.com', accountType: 'individual', desiredOutcome: 'learn', productUpdatesConsent: true, termsVersion: '2026-08-01' }, config, fetchImpl: async () => response(500) }), /Waitlist capture failed/);
});
