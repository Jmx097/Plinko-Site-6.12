import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('legacy CRM operators retain a Core-outage-safe My Work path while role access is additive', async () => {
  const page = await readFile(new URL('../app/account/page.jsx', import.meta.url), 'utf8');
  const roleRead = page.indexOf('try { roleAccess = await getMemberRoleAccess({ userId }); }');
  const crmCheck = page.indexOf('const crmAccess = await hasCrmWorkspaceAccess(user, userId);');
  const myWork = page.indexOf('Plinko Pocket · My Work');
  const coreReads = page.indexOf('Promise.all([getMemberOverview({ userId }), getMemberDashboard({ userId })])');

  assert.ok(roleRead >= 0, 'role lookup must be server-side and bounded');
  assert.ok(crmCheck > roleRead, 'CRM access must derive from the verified user and verified subject');
  assert.ok(myWork > crmCheck, 'authorized users must receive the My Work entry surface');
  assert.ok(coreReads > myWork, 'legacy CRM fallback must remain available before referral Core reads');
  assert.match(page, /href="\/crm"/);
});
