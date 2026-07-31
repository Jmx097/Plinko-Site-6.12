import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createSupportRequestWithConfig,
  getMemberDashboardWithConfig,
  normalizeModuleGrant,
  normalizeSupportRequest,
  setMemberModuleGrantWithConfig,
} from '../lib/member-dashboard-core.mjs';

const config = { url: 'https://core.example.supabase.co', serviceRoleKey: 'service-role-test-key' };
const response = (status, body = '') => new Response(body, { status });

test('member dashboard reads grants and support requests only for the verified subject', async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    if (url.includes('member_module_grants?')) return response(200, JSON.stringify([{ module_key: 'community', expires_at: null }, { module_key: 'workspace', expires_at: '2000-01-01T00:00:00Z' }]));
    if (url.includes('member_support_requests?')) return response(200, JSON.stringify([{ id: '11111111-1111-1111-1111-111111111111', subject: 'Help', status: 'open', created_at: '2026-08-01T00:00:00Z' }]));
    throw new Error(`unexpected request ${url}`);
  };
  const dashboard = await getMemberDashboardWithConfig({ userId: 'user_member', config, fetchImpl });
  assert.deepEqual(dashboard.modules, ['community']);
  assert.equal(dashboard.supportRequests.length, 1);
  assert.ok(requests.every((url) => url.includes('user_member')));
});

test('support request creation uses the verified subject and service-role adapter', async () => {
  let call;
  const created = await createSupportRequestWithConfig({ userId: 'user_member', subject: ' Need help ', message: ' Please help me ', config, fetchImpl: async (url, init) => {
    call = { url, init };
    return response(201, JSON.stringify([{ id: '11111111-1111-1111-1111-111111111111', subject: 'Need help', status: 'open', created_at: '2026-08-01T00:00:00Z' }]));
  } });
  assert.equal(JSON.parse(call.init.body).user_id, 'user_member');
  assert.equal(JSON.parse(call.init.body).message, 'Please help me');
  assert.equal(call.init.headers.Authorization, 'Bearer service-role-test-key');
  assert.equal(created.status, 'open');
});

test('module grants are constrained and administered via an explicit server subject', async () => {
  assert.throws(() => normalizeModuleGrant({ moduleKey: 'payments', enabled: true }), /Unknown module grant/);
  assert.throws(() => normalizeSupportRequest({ subject: '', message: 'x' }), /Support subject/);
  let body;
  await setMemberModuleGrantWithConfig({ userId: 'user_member', moduleKey: 'community', enabled: true, actorEmail: 'STAFF@example.com', config, fetchImpl: async (_url, init) => {
    body = JSON.parse(init.body);
    return response(201);
  } });
  assert.deepEqual(body, { user_id: 'user_member', module_key: 'community', enabled: true, granted_by_email: 'staff@example.com' });
});
