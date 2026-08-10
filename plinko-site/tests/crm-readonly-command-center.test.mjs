import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('CRM integration is server-only, exposes account workspace reads, and limits writes to append-only notes', async () => {
  const integration = await source('lib/crm-api.mjs');
  assert.match(integration, /import 'server-only'/);
  assert.match(integration, /CRM_API_BASE_URL/);
  assert.match(integration, /CRM_API_TOKEN/);
  assert.match(integration, /\/crm\/stations\/overview\?limit=100/);
  assert.match(integration, /\/crm\/accounts\/\$\{encodeURIComponent\(accountId\)\}\/workspace/);
  assert.match(integration, /\/crm\/accounts\/\$\{encodeURIComponent\(accountId\)\}\/notes/);
  assert.match(integration, /cache: 'no-store'/);
  assert.match(integration, /governance\?\.mode !== 'read_only'/);
  assert.doesNotMatch(integration, /NEXT_PUBLIC_CRM/);
  assert.doesNotMatch(integration, /\/crm\/approvals/);
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
  assert.match(page, /record\.account/);
  assert.match(page, /displayName: account\.displayName/);
  assert.match(page, /externalReference: account\.externalReference/);
  assert.match(page, /freshness\.checked_at/);
  assert.doesNotMatch(page, /<form/);
  assert.doesNotMatch(page, /<button/);
  assert.doesNotMatch(page, /actions/);
});

test('CRM workspace has a conventional account workspace: structured contacts, next action, activity, and governed follow-up tasks', async () => {
  const client = await source('app/admin/crm/workspace/CrmWorkspace.jsx');
  assert.match(client, /'use client'/);
  assert.match(client, /Next action/);
  assert.match(client, /Open follow-ups/);
  assert.match(client, /Activity/);
  assert.match(client, /People/);
  assert.match(client, /Source intake/);
  assert.match(client, /Add follow-up/);
  assert.match(client, /Complete task/);
  assert.match(client, /owner \{task\.owner/);
  assert.match(client, /Source &amp; governance/);
  assert.match(client, /method: 'POST'/);
  assert.match(client, /\/api\/admin\/crm\/accounts/);
  assert.doesNotMatch(client, /\/crm\/approvals/);
});

test('account workspace route requires Clerk staff access and does not forward a caller-supplied audit actor', async () => {
  const route = await source('app/api/admin/crm/accounts/[accountId]/route.js');
  const integration = await source('lib/crm-api.mjs');
  assert.match(route, /@clerk\/nextjs\/server/);
  assert.match(route, /requireAdminEmail\(user\)/);
  assert.match(route, /requireStaffAccess/);
  assert.match(route, /getCrmAccountWorkspace/);
  assert.match(route, /addCrmAccountNote/);
  assert.match(route, /addCrmFollowUpTask/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_CRM/);
  assert.doesNotMatch(integration, /x-crm-actor/);
  assert.doesNotMatch(route, /approvals/);
});

test('no CRM server action remains available to mutate approval state', async () => {
  const actions = await source('app/admin/crm/actions.js');
  assert.doesNotMatch(actions, /'use server'/);
  assert.doesNotMatch(actions, /decideCrmApproval/);
  assert.doesNotMatch(actions, /POST/);
});
