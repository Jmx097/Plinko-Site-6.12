import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('the authenticated account home links role-authorized Sales users into the shared campaign workspace', async () => {
  const page = await source('app/account/page.jsx');
  assert.match(page, /hasCrmWorkspaceAccess/);
  assert.match(page, /getMemberRoleAccess/);
  assert.match(page, /href="\/crm"/);
  assert.match(page, /My Work/);
});

test('the Pocket staff control plane links authorized operators into the shared campaign workspace', async () => {
  const page = await source('app/admin/page.jsx');
  assert.match(page, /requireCrmEqualAdminEmail/);
  assert.match(page, /href="\/crm"/);
  assert.match(page, /Open campaign CRM/);
});

test('the CRM gives an operator a real return path to the authenticated account home', async () => {
  const page = await source('app/crm/CrmWorkspace.jsx');
  assert.match(page, /href="\/account"/);
  assert.match(page, /Back to account home/);
});
