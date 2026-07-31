import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) { return readFile(new URL(path, root), 'utf8'); }

test('admin allowlist is server-only, comma-separated, and case-insensitive', async () => {
  const admin = await source('lib/plinko-pocket-admin.mjs');
  assert.match(admin, /import 'server-only'/);
  assert.match(admin, /PLINKO_POCKET_ADMIN_EMAILS/);
  assert.match(admin, /\.split\(','\)/);
  assert.match(admin, /toLowerCase\(\)/);
  assert.match(admin, /allowlist\.includes/);
});

test('admin is Clerk-protected and actions re-verify staff access without browser user IDs', async () => {
  const [middleware, page, actions] = await Promise.all([
    source('middleware.js'), source('app/admin/page.jsx'), source('app/admin/actions.js'),
  ]);
  assert.match(middleware, /['"]\/admin\(\.\*\)['"]/);
  assert.match(page, /requireAdminEmail/);
  assert.match(actions, /requireAdminEmail/);
  assert.match(actions, /updateGrantForMember\(userId, moduleKey, formData\)/);
  assert.match(page, /updateGrantForMember\.bind\(null, memberUserId, moduleKey\)/);
  assert.doesNotMatch(page, /name=['"]userId['"]/);
  assert.doesNotMatch(page, /<input[^>]+userId/);
});

test('dashboard migration has member-only safe reads and no public writes', async () => {
  const migration = await source('supabase/migrations/20260801090000_plinko_pocket_dashboard.sql');
  assert.match(migration, /create table public\.member_module_grants/);
  assert.match(migration, /create table public\.member_support_requests/);
  assert.match(migration, /alter table public\.member_module_grants enable row level security/);
  assert.match(migration, /alter table public\.member_support_requests enable row level security/);
  assert.match(migration, /member_select_own_module_grants[\s\S]*auth\.jwt\(\) ->> 'sub'/);
  assert.match(migration, /member_select_own_support_requests[\s\S]*auth\.jwt\(\) ->> 'sub'/);
  assert.match(migration, /revoke all on public\.member_module_grants from anon, authenticated/);
  assert.match(migration, /revoke all on public\.member_support_requests from anon, authenticated/);
  assert.doesNotMatch(migration, /for insert/);
  assert.doesNotMatch(migration, /for update/);
});
