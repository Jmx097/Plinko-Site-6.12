import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { capabilitiesForRoles, getMemberRoleAccessWithConfig, setMemberRoleWithConfig } from '../lib/pocket-roles-core.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const config = { url: 'https://core.example.test', serviceRoleKey: 'service-role-test-key' };
const response = (status, body = '') => new Response(body, { status });

test('roles compose capabilities without browser-defined permissions', () => {
  assert.deepEqual(capabilitiesForRoles(['sales']), ['crm.workspace', 'stations.playbooks']);
  assert.deepEqual(capabilitiesForRoles(['sales', 'demo']), ['crm.workspace', 'demo.course', 'stations.playbooks']);
  assert.deepEqual(capabilitiesForRoles(['unknown']), []);
});

test('role reads and writes stay scoped to the verified member subject', async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === 'POST') return response(201);
    return response(200, JSON.stringify([{ role_key: 'sales', expires_at: null }, { role_key: 'demo', expires_at: '2000-01-01T00:00:00Z' }]));
  };
  const access = await getMemberRoleAccessWithConfig({ userId: 'user_sales', config, fetchImpl });
  assert.deepEqual(access.roles, ['sales']);
  assert.ok(calls[0].url.includes('user_sales'));
  await setMemberRoleWithConfig({ userId: 'user_sales', roleKey: 'demo', enabled: true, actorEmail: 'STAFF@example.com', config, fetchImpl });
  const body = JSON.parse(calls.at(-1).init.body);
  assert.deepEqual(body, { user_id: 'user_sales', role_key: 'demo', enabled: true, granted_by_email: 'staff@example.com' });
});

test('role schema and routes fail closed while Sales and Demo stay separate', async () => {
  const [migration, middleware, crm, demo, account, admin] = await Promise.all([
    source('supabase/migrations/20260819210000_pocket_roles.sql'), source('middleware.js'), source('app/crm/page.jsx'), source('app/demo/page.jsx'), source('app/account/page.jsx'), source('app/admin/page.jsx'),
  ]);
  assert.match(migration, /create table public\.member_role_assignments/);
  assert.match(migration, /unique \(user_id, role_key\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /member_select_own_role_assignments[\s\S]*auth\.jwt\(\) ->> 'sub'/);
  assert.match(migration, /revoke all on public\.member_role_assignments from anon, authenticated/);
  assert.match(middleware, /'\/demo\(\.\*\)'/);
  assert.match(crm, /requireCrmWorkspaceAccess/);
  assert.match(demo, /demo\.course/);
  assert.match(account, /Five station playbooks/);
  assert.match(admin, /Roles compose/);
});
