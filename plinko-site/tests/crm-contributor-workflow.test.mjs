import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('the retired contributor entry point cannot retain a contributor-only CRM path', async () => {
  const page = await source('app/crm/page.jsx');
  const route = await source('app/api/crm/accounts/route.js');
  const environment = await source('.env.example');
  assert.doesNotMatch(page, /requireContributorEmail|contributorOverviewAccounts|CrmContributor/);
  assert.doesNotMatch(route, /requireContributorEmail|contributorSource|createSourceIntakeAccount/);
  assert.doesNotMatch(environment, /PLINKO_CRM_CONTRIBUTOR_EMAILS/);
});

test('the shared CRM route and API remain Clerk-protected', async () => {
  const middleware = await source('middleware.js');
  const page = await source('app/crm/page.jsx');
  const broker = await source('app/api/crm/workspace/route.js');
  assert.match(middleware, /'\/crm\(\.\*\)'/);
  assert.match(middleware, /'\/api\/crm\(\.\*\)'/);
  assert.match(page, /requireCrmWorkspaceAccess/);
  assert.match(broker, /requireCrmWorkspaceAccess/);
});
