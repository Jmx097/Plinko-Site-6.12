import assert from 'node:assert/strict';
import test from 'node:test';

import { getWaitlistEntriesWithConfig, setWaitlistStatusWithConfig } from '../lib/waitlist-core.mjs';

const config = { url: 'https://core.example.test', serviceRoleKey: 'service-role' };
const response = (status, body = null) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('staff queue returns bounded newest-first records', async () => {
  let requested; const rows = [{ id: '1', email: 'a@example.com', status: 'waiting' }];
  const result = await getWaitlistEntriesWithConfig({ config, fetchImpl: async (url) => { requested = url; return response(200, rows); } });
  assert.deepEqual(result, rows); assert.match(requested, /order=created_at\.desc&limit=200/);
});

test('staff lifecycle update uses one atomic RPC and validates the returned row', async () => {
  let call;
  await setWaitlistStatusWithConfig({ entryId: '11111111-1111-4111-8111-111111111111', status: 'qualified', actorEmail: 'staff@example.com', config, fetchImpl: async (url, options) => { call = { url, options }; return response(200, [{ id: '11111111-1111-4111-8111-111111111111', status: 'qualified' }]); } });
  assert.match(call.url, /rpc\/set_waitlist_status$/);
  assert.deepEqual(JSON.parse(call.options.body), { p_entry_id: '11111111-1111-4111-8111-111111111111', p_status: 'qualified', p_actor_email: 'staff@example.com' });
  await assert.rejects(() => setWaitlistStatusWithConfig({ entryId: '11111111-1111-4111-8111-111111111111', status: 'paid', actorEmail: 'staff@example.com', config }), /Invalid waitlist status/);
  await assert.rejects(() => setWaitlistStatusWithConfig({ entryId: 'not-a-uuid------------------------', status: 'qualified', actorEmail: 'staff@example.com', config }), /Invalid waitlist entry/);
});
