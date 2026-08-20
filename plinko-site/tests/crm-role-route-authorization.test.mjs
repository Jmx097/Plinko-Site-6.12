import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { crmApiActor, crmPageAuthorization } from '../lib/crm-route-access-core.mjs';
import { requireCrmWorkspaceAccessWithRoleAccess } from '../lib/crm-equal-admin-core.mjs';
import { getMemberRoleAccessWithConfig } from '../lib/pocket-roles-core.mjs';

const environment = { PLINKO_POCKET_ADMIN_EMAILS: 'legacy@example.com' };
const config = { url: 'https://core.example.test', serviceRoleKey: 'service-role-test-key' };
const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const user = (email) => ({
  primaryEmailAddressId: 'primary',
  emailAddresses: [{ id: 'primary', emailAddress: email, verification: { status: 'verified' } }],
});

function requireAccessFor(assignments, { fail = false } = {}) {
  return (member, subject) => requireCrmWorkspaceAccessWithRoleAccess(member, subject, environment, async (userId) => {
    if (fail) throw new Error('role store unavailable');
    return getMemberRoleAccessWithConfig({
      userId,
      config,
      now: Date.parse('2026-08-20T00:00:00Z'),
      fetchImpl: async () => new Response(JSON.stringify(assignments[userId] || []), { status: 200 }),
    });
  });
}

test('/crm and /api/crm use the exercised route authorization adapters', async () => {
  const [page, api] = await Promise.all([source('app/crm/page.jsx'), source('app/api/crm/workspace/route.js')]);
  assert.match(page, /crmPageAuthorization/);
  assert.match(api, /crmApiActor/);
});

for (const [condition, assignments, options] of [
  ['disabled', { legacy: [{ role_key: 'sales', enabled: false, expires_at: null }] }],
  ['expired', { legacy: [{ role_key: 'sales', enabled: true, expires_at: '2000-01-01T00:00:00Z' }] }],
  ['role-store failure', {}, { fail: true }],
]) {
  test(`/crm redirects legacy users to /account when Sales is ${condition}`, async () => {
    const result = await crmPageAuthorization({ user: user('legacy@example.com'), userId: 'legacy', requireAccess: requireAccessFor(assignments, options) });
    assert.deepEqual(result, { allowed: false, redirectTo: '/account' });
  });

  test(`/api/crm returns no actor when Sales is ${condition}`, async () => {
    const result = await crmApiActor({ user: user('legacy@example.com'), userId: 'legacy', requireAccess: requireAccessFor(assignments, options) });
    assert.equal(result, null);
  });
}

test('/crm and /api/crm preserve legacy access for an allowlisted Demo-only member', async () => {
  const requireAccess = requireAccessFor({ demo_only_legacy: [{ role_key: 'demo', enabled: true, expires_at: null }] });
  const member = user('legacy@example.com');
  assert.deepEqual(await crmPageAuthorization({ user: member, userId: 'demo_only_legacy', requireAccess }), { allowed: true });
  assert.equal(await crmApiActor({ user: member, userId: 'demo_only_legacy', requireAccess }), 'legacy@example.com');
});

test('/crm and /api/crm authorize an active Sales member without a legacy allowlist entry', async () => {
  const requireAccess = requireAccessFor({ sales_member: [{ role_key: 'sales', enabled: true, expires_at: null }] });
  const member = user('sales@example.com');
  assert.deepEqual(await crmPageAuthorization({ user: member, userId: 'sales_member', requireAccess }), { allowed: true });
  assert.equal(await crmApiActor({ user: member, userId: 'sales_member', requireAccess }), 'sales@example.com');
});
