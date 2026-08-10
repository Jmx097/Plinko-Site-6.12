import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('CRM command-center integration is server-only and reads only the overview contract', async () => {
  const integration = await source('lib/crm-api.mjs');
  assert.match(integration, /import 'server-only'/);
  assert.match(integration, /CRM_API_BASE_URL/);
  assert.match(integration, /CRM_API_TOKEN/);
  assert.match(integration, /\/crm\/stations\/overview\?limit=100/);
  assert.match(integration, /cache: 'no-store'/);
  assert.match(integration, /governance\?\.mode !== 'read_only'/);
  assert.doesNotMatch(integration, /NEXT_PUBLIC_CRM/);
  assert.doesNotMatch(integration, /\/crm\/approvals/);
  assert.doesNotMatch(integration, /method:\s*'POST'/);
});

test('staff CRM page presents a read-only queue and retains Clerk plus allowlist gates', async () => {
  const page = await source('app/admin/crm/page.jsx');
  assert.match(page, /@clerk\/nextjs\/server/);
  assert.match(page, /await auth\(\)/);
  assert.match(page, /await currentUser\(\)/);
  assert.match(page, /requireAdminEmail\(user\)/);
  assert.match(page, /getCrmStationOverview\(\)/);
  assert.match(page, /read-only/);
  assert.match(page, /freshness\.checked_at/);
  assert.match(page, /stations\.reviewQueue/);
  assert.doesNotMatch(page, /<form/);
  assert.doesNotMatch(page, /<button/);
  assert.doesNotMatch(page, /actions/);
});

test('CRM workspace is a separate, staff-gated, read-only table-first route', async () => {
  const page = await source('app/admin/crm/workspace/page.jsx');
  assert.match(page, /@clerk\/nextjs\/server/);
  assert.match(page, /await auth\(\)/);
  assert.match(page, /requireAdminEmail\(user\)/);
  assert.match(page, /getCrmStationOverview\(\)/);
  assert.match(page, /This Week — Governed Campaigns/);
  assert.match(page, /CrmWorkspace/);
  assert.match(page, /freshness\.checked_at/);
  assert.doesNotMatch(page, /<form/);
  assert.doesNotMatch(page, /<button/);
  assert.doesNotMatch(page, /actions/);
});

test('CRM workspace client interactions are read-only and have real controls', async () => {
  const client = await source('app/admin/crm/workspace/CrmWorkspace.jsx');
  assert.match(client, /'use client'/);
  assert.match(client, /useState/);
  assert.match(client, /<button/);
  assert.match(client, /onClick/);
  assert.match(client, /<details/);
  assert.match(client, /filter/);
  assert.doesNotMatch(client, /fetch\(/);
  assert.doesNotMatch(client, /<form/);
  assert.doesNotMatch(client, /method:\s*'POST'/);
});

test('no CRM server action remains available to mutate approval state', async () => {
  const actions = await source('app/admin/crm/actions.js');
  assert.doesNotMatch(actions, /'use server'/);
  assert.doesNotMatch(actions, /decideCrmApproval/);
  assert.doesNotMatch(actions, /POST/);
});
