import assert from 'node:assert/strict';
import { test } from 'node:test';

import { activateMemberWithConfig, getMemberOverviewWithConfig } from '../lib/member-activation-core.mjs';

const config = {
  url: 'https://core.example.supabase.co',
  serviceRoleKey: 'service-role-test-key',
  publishableKey: 'publishable-test-key',
  appUrl: 'https://app.plinkosolutions.com',
};

function response(status, body = '') {
  return new Response(body, { status });
}

test('activation creates a profile and one server-generated referral link', async () => {
  const calls = [];
  let link = null;
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.includes('member_profiles?')) return response(201);
    if (url.includes('referral_links?owner_user_id=')) return response(200, JSON.stringify(link ? [link] : []));
    if (url.includes('referral_links?on_conflict=owner_user_id')) {
      const body = JSON.parse(init.body);
      assert.equal(body.owner_user_id, 'user_member');
      assert.match(body.code, /^p-[a-f0-9]{24}$/);
      link = { code: body.code };
      return response(201);
    }
    throw new Error(`unexpected request ${url}`);
  };

  const result = await activateMemberWithConfig({ userId: 'user_member', config, fetchImpl });
  assert.equal(result.activatedNow, true);
  assert.equal(result.referralCode, link.code);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer service-role-test-key');
  assert.equal(calls[0].init.cache, 'no-store');
});

test('activation reuses an existing link and member overview is scoped to the authenticated subject', async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    if (url.includes('member_profiles?')) return response(201);
    if (url.includes('referral_links?owner_user_id=')) return response(200, JSON.stringify([{ code: 'p-existing' }]));
    if (url.includes('referral_attributions?')) return response(200, JSON.stringify([{ id: 1 }, { id: 2 }]));
    if (url.includes('commission_ledger?')) return response(200, JSON.stringify([
      { state: 'pending', commission_cents: 200, currency: 'usd' },
      { state: 'available', commission_cents: 440, currency: 'usd' },
    ]));
    throw new Error(`unexpected request ${url}`);
  };

  const result = await getMemberOverviewWithConfig({ userId: 'user_member', config, fetchImpl });
  assert.deepEqual(result, {
    referralCode: 'p-existing',
    activatedNow: false,
    referralCount: 2,
    pendingCommissionCount: 1,
    availableByCurrency: { usd: 440 },
  });
  assert.ok(requests.every((url) => url.includes('user_member') || url.includes('member_profiles?')));
});

test('activation fails closed without a Clerk subject or Core configuration', async () => {
  await assert.rejects(() => activateMemberWithConfig({ userId: '', config }), /Invalid authenticated member subject/);
  await assert.rejects(() => activateMemberWithConfig({ userId: 'user_member', config: {} }), /Missing Plinko Solutions Core configuration/);
});
