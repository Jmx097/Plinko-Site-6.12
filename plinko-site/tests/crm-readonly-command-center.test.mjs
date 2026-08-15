import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) { return readFile(new URL(path, root), 'utf8'); }

test('shared CRM integration is server-only and writes require signed actor assertions', async () => {
  const integration = await source('lib/crm-api.mjs');
  assert.match(integration, /import 'server-only'/);
  assert.match(integration, /CRM_API_BASE_URL/);
  assert.match(integration, /CRM_API_TOKEN/);
  assert.match(integration, /CRM_ACTOR_SIGNING_SECRET/);
  assert.match(integration, /crmActorSigningHeaders/);
  assert.doesNotMatch(integration, /NEXT_PUBLIC_CRM|x-crm-actor-email/);
});

test('legacy admin CRM routes redirect into the shared workspace', async () => {
  for (const path of ['app/admin/crm/page.jsx', 'app/admin/crm/workspace/page.jsx']) {
    assert.match(await source(path), /redirect\('\/crm'\)/);
  }
});

test('CRM is an account-first conventional work loop rather than a review-stage screen', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  assert.match(client, /useState\('Accounts'\)/);
  assert.match(client, /Search accounts/);
  assert.match(client, /Account directory/);
  assert.match(client, /Next action/);
  assert.match(client, /\['Overview', 'People', 'Activity'\]/);
  assert.match(client, /Open tasks/);
  assert.match(client, /Add note/);
  assert.match(client, /Create task/);
  assert.match(client, /Complete task/);
  assert.match(client, /Record details/);
  assert.match(client, /Campaigns/);
  assert.doesNotMatch(client, /Governed workflow|Governance gate|crm-governance-banner/);
  assert.doesNotMatch(client, /account\.id|task\.id/);
});

test('workspace API exposes opaque handles and resolves account/task IDs only on the server', async () => {
  const route = await source('app/api/crm/workspace/route.js');
  const broker = await source('lib/crm-workspace.mjs');
  const integration = await source('lib/crm-api.mjs');
  assert.match(route, /HANDLE_PATTERN/);
  assert.match(route, /requiredHandle\(payload, 'accountKey', 'account'\)/);
  assert.match(route, /hasCrmRecordHandle\('account', item\.id, accountKey/);
  // A task handle is scoped to the selected account, not merely signed by kind.
  assert.match(route, /hasCrmRecordHandle\('task', `\$\{account\.id\}:\$\{item\.id\}`, payload\.taskKey/);
  assert.match(route, /MAX_DIRECTORY_PAGES = 20/);
  assert.match(route, /seenCursors/);
  assert.match(route, /content: \{ body: safe\(draft\.content\?\.body, ''\) \}/);
  assert.doesNotMatch(route, /external_reference \|\| account\.externalReference/);
  assert.match(broker, /account_workspace: \{ method: 'GET', path: \(p\) => `\/crm\/accounts\/\$\{encodeURIComponent\(p\.account_id\)\}\/workspace` \}/);
  assert.match(broker, /create_note: \{ method: 'POST'.*\/notes/s);
  assert.match(broker, /create_task: \{ method: 'POST'.*\/tasks/s);
  assert.match(broker, /complete_task: \{ method: 'POST'.*\/complete/s);
  assert.match(integration, /createHmac/);
  assert.match(integration, /timingSafeEqual/);
});

test('campaign lifecycle decisions use backend values while keeping human approval controls', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');
  const broker = await source('lib/crm-workspace.mjs');

  assert.match(route, /DECISIONS = new Set\(\['approved', 'rejected'\]\)/);
  assert.match(client, /Approve contact/);
  assert.match(client, /Reject contact/);
  assert.match(client, /contact_approval', \{ accountKey, contactKey: person\.key, decision: 'approved'/);
  assert.match(client, /contact_approval', \{ accountKey, contactKey: person\.key, decision: 'rejected'/);
  assert.match(client, /Approve account/);
  assert.match(client, /Account status decision/);
  assert.match(client, /draft_approval'.*decision: 'approved'/);
  assert.match(client, /attempt_approval'.*decision: 'rejected'/);
  assert.doesNotMatch(client, /decision: 'approve'/);
  assert.doesNotMatch(client, /decision: 'reject'/);
  assert.match(broker, /contact_approval: \{ method: 'POST'.*\/approval/s);
  assert.doesNotMatch(broker, /send|dial|provider.*send/i);
});

test('contact and account review actions stay scoped to opaque browser handles', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  const route = await source('app/api/crm/workspace/route.js');

  assert.match(route, /requiredHandle\(payload, 'contactKey', 'contact'\)/);
  assert.match(route, /hasCrmRecordHandle\('contact', item\.id, payload\.contactKey, config\)/);
  assert.match(route, /create_account_approval', \{ account_id: account\.id, gate: 'intake', decision: payload\.decision \}/);
  assert.doesNotMatch(client, /person\.id|person\.contact_id|account\.id/);
  assert.doesNotMatch(client, /send|dial|provider.*send/i);
});

test('legacy account API cannot bypass the shared actor-aware broker', async () => {
  const route = await source('app/api/admin/crm/accounts/[accountId]/route.js');
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /CRM_API_TOKEN|NEXT_PUBLIC_CRM/);
});
