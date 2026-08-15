import test from 'node:test';
import assert from 'node:assert/strict';
import { isCrmEqualAdminEmail, verifiedPrimaryEmail } from '../lib/crm-equal-admin-core.mjs';

const environment = { PLINKO_POCKET_ADMIN_EMAILS: 'existing@example.com', PLINKO_CRM_EQUAL_ADMIN_EMAILS: 'equal@example.com, Other@example.com' };
const user = (email, status = 'verified') => ({ primaryEmailAddressId: 'primary', emailAddresses: [{ id: 'primary', emailAddress: email, verification: { status } }] });

test('CRM access includes existing admins and CRM equal admins, case-insensitively', () => {
  assert.equal(isCrmEqualAdminEmail('EXISTING@example.com', environment), true);
  assert.equal(isCrmEqualAdminEmail('OTHER@example.com', environment), true);
  assert.equal(isCrmEqualAdminEmail('member@example.com', environment), false);
  assert.equal(verifiedPrimaryEmail(user('EQUAL@example.com')), 'equal@example.com');
});
test('verified Clerk email helper fails closed for an unverified email', () => {
  assert.equal(verifiedPrimaryEmail(user('equal@example.com', 'unverified')), undefined);
});
