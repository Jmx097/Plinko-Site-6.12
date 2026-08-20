import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCrmWorkspaceAccessWithRoleAccess, isCrmEqualAdminEmail, requireCrmWorkspaceAccessWithRoleAccess, verifiedPrimaryEmail } from '../lib/crm-equal-admin-core.mjs';
import { getMemberRoleAccessWithConfig } from '../lib/pocket-roles-core.mjs';

const environment = { PLINKO_POCKET_ADMIN_EMAILS: 'existing@example.com', PLINKO_CRM_EQUAL_ADMIN_EMAILS: 'equal@example.com, Other@example.com' };
const user = (email, status = 'verified') => ({ primaryEmailAddressId: 'primary', emailAddresses: [{ id: 'primary', emailAddress: email, verification: { status } }] });

test('CRM access includes existing admins and CRM equal admins, case-insensitively', () => {
  assert.equal(isCrmEqualAdminEmail('EXISTING@example.com', environment), true);
  assert.equal(isCrmEqualAdminEmail('OTHER@example.com', environment), true);
  assert.equal(isCrmEqualAdminEmail('member@example.com', environment), false);
  assert.equal(verifiedPrimaryEmail(user('EQUAL@example.com')), 'equal@example.com');
});
test('a legacy CRM allowlist cannot override explicit disabled or expired Sales state', async () => {
  const assignments = {
    legacy_disabled: [{ role_key: 'sales', enabled: false, expires_at: null }],
    legacy_expired: [{ role_key: 'sales', enabled: true, expires_at: '2000-01-01T00:00:00Z' }],
    legacy_unassigned: [],
  };
  const roleAccessFor = (userId) => getMemberRoleAccessWithConfig({
    userId,
    config: { url: 'https://core.example.test', serviceRoleKey: 'service-role-test-key' },
    now: Date.parse('2026-08-20T00:00:00Z'),
    fetchImpl: async () => new Response(JSON.stringify(assignments[userId]), { status: 200 }),
  });

  assert.equal(await hasCrmWorkspaceAccessWithRoleAccess(user('existing@example.com'), 'legacy_disabled', environment, roleAccessFor), false, 'disabled Sales must deny /crm and /api/crm');
  assert.equal(await hasCrmWorkspaceAccessWithRoleAccess(user('existing@example.com'), 'legacy_expired', environment, roleAccessFor), false, 'expired Sales must deny /crm and /api/crm');
  assert.equal(await hasCrmWorkspaceAccessWithRoleAccess(user('existing@example.com'), 'legacy_unassigned', environment, roleAccessFor), true, 'unassigned legacy operator keeps the compatibility fallback');
});

test('role-store failures deny legacy CRM allowlists instead of falling back', async () => {
  const roleStoreFailure = async () => { throw new Error('role store unavailable'); };
  assert.equal(await hasCrmWorkspaceAccessWithRoleAccess(user('existing@example.com'), 'legacy_failure', environment, roleStoreFailure), false);
  await assert.rejects(
    requireCrmWorkspaceAccessWithRoleAccess(user('existing@example.com'), 'legacy_failure', environment, roleStoreFailure),
    /CRM workspace access required/,
  );
});

test('an explicit active Sales role grants CRM access without a legacy allowlist entry', async () => {
  const roleAccessFor = async () => ({ roles: ['sales'], capabilities: ['crm.workspace', 'stations.playbooks'], hasRoleAssignment: true });
  assert.equal(await hasCrmWorkspaceAccessWithRoleAccess(user('sales@example.com'), 'active_sales', {}, roleAccessFor), true);
});

test('verified Clerk email helper fails closed for an unverified email', () => {
  assert.equal(verifiedPrimaryEmail(user('equal@example.com', 'unverified')), undefined);
});
