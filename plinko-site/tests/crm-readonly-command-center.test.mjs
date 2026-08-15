import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('shared CRM integration is server-only, uses a server token, and requires signed actor assertions for writes', async () => {
  const integration = await source('lib/crm-api.mjs');
  assert.match(integration, /import 'server-only'/);
  assert.match(integration, /CRM_API_BASE_URL/);
  assert.match(integration, /CRM_API_TOKEN/);
  assert.match(integration, /CRM_ACTOR_SIGNING_SECRET/);
  assert.match(integration, /crmActorSigningHeaders/);
  assert.match(integration, /if \(isWrite && !config\.actorSigningSecret\)/);
  assert.doesNotMatch(integration, /NEXT_PUBLIC_CRM|x-crm-actor-email/);
});

test('legacy admin CRM routes redirect into the shared equal-admin workspace', async () => {
  for (const path of ['app/admin/crm/page.jsx', 'app/admin/crm/workspace/page.jsx']) {
    const page = await source(path);
    assert.match(page, /redirect\('\/crm'\)/);
  }
});

test('shared workspace retains a conventional CRM work loop and manual-only boundary', async () => {
  const client = await source('app/crm/CrmWorkspace.jsx');
  assert.match(client, /Accounts.*Campaigns.*People.*Activity/s);
  assert.match(client, /Manual outreach only/);
  assert.match(client, /never sends through a provider, dialer, or LinkedIn automation/);
  assert.match(client, /create_campaign/);
  assert.match(client, /create_contact/);
  assert.match(client, /manual_execution/);
  assert.match(client, /Choose people and records by name/);
  assert.match(client, /OptionSelect/);
  assert.doesNotMatch(client, /placeholder=\{field/);
});

test('workspace API augments the workbench with the authoritative account directory', async () => {
  const route = await source('app/api/crm/workspace/route.js');
  const broker = await source('lib/crm-workspace.mjs');
  assert.match(route, /crmWorkspaceAction\('list_accounts'/);
  assert.match(route, /accounts: accountDirectory\.accounts/);
  assert.match(broker, /list_accounts: \{ method: 'GET', path: \(\) => '\/crm\/accounts\?limit=100' \}/);
});

test('legacy account API cannot bypass the shared actor-aware broker', async () => {
  const route = await source('app/api/admin/crm/accounts/[accountId]/route.js');
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /CRM_API_TOKEN|NEXT_PUBLIC_CRM/);
});
