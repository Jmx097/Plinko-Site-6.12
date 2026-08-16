import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('CRM admins can enter the campaign workspace without Pocket Core reads', async () => {
  const page = await readFile(new URL('../app/account/page.jsx', import.meta.url), 'utf8');
  const crmCheck = page.indexOf('try { requireCrmEqualAdminEmail(user); crmAdmin = true; }');
  const coreReads = page.indexOf('Promise.all([getMemberOverview({ userId }), getMemberDashboard({ userId })])');
  const crmHome = page.indexOf('Plinko CRM · operator home');

  assert.ok(crmCheck >= 0, 'CRM authorization must be derived from the verified server user');
  assert.ok(crmHome > crmCheck, 'CRM-authorized users must receive a dedicated operator home');
  assert.ok(coreReads > crmHome, 'Pocket Core reads must happen only after the CRM operator return path');
  assert.match(page, /href="\/crm"/);
});
