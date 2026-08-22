import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { COPILOT_LIMITS, COPILOT_TOOL_CATALOG } from '../lib/copilot-policy-core.mjs';
import { normalizeCopilotCommand, toCopilotAccountDetail } from '../lib/copilot-bff-core.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const opaqueAccountKey = `account_${'A'.repeat(43)}`;

test('adversarial commands cannot select a route, inject fields, or use a malformed cross-scope handle', () => {
  assert.deepEqual(normalizeCopilotCommand({ tool: 'my_work' }), { tool: 'my_work' });
  assert.deepEqual(normalizeCopilotCommand({ tool: 'account_detail', accountKey: opaqueAccountKey }), { tool: 'account_detail', accountKey: opaqueAccountKey });

  for (const command of [
    { tool: 'account_detail', accountKey: 'account_raw-crm-id' },
    { tool: 'account_detail', accountKey: opaqueAccountKey, accountId: 'raw-crm-id' },
    { tool: 'account_search', query: 'Northstar', path: '/api/crm/workspace' },
    { tool: 'my_work', method: 'DELETE' },
    { tool: '__proto__' },
  ]) assert.throws(() => normalizeCopilotCommand(command), /Invalid Copilot request|Invalid account handle|Unsupported Copilot tool/);
});

test('adversarial access paths fail closed and bind each request to verified Clerk and CRM authority', async () => {
  const [route, access, broker, middleware] = await Promise.all([
    source('app/api/copilot/route.js'),
    source('lib/copilot-access.mjs'),
    source('lib/copilot-bff.mjs'),
    source('middleware.js'),
  ]);

  assert.match(middleware, /'\/api\/copilot\(\.\*\)'/);
  assert.match(route, /if \(!userId\).*status: 403/s);
  assert.match(route, /requireCopilotWorkspaceAccess\(await currentUser\(\), userId\)/);
  assert.match(route, /executeCopilotReadInternal/);
  assert.match(route, /status: 403/);
  assert.match(access, /if \(!userId \|\| !email\) throw new Error\('Copilot workspace access required'\)/);
  assert.match(access, /access\.roles\.includes\('sales'\)/);
  assert.match(access, /access\.capabilities\.includes\(COPILOT_PARENT_CAPABILITY\)/);
  assert.match(access, /access\.capabilities\.includes\(COPILOT_CAPABILITY\)/);
  assert.match(broker, /executeCopilotReadInternal/);
  assert.match(access, /isCrmEqualAdminEmail/);
  assert.match(broker, /hasCrmRecordHandle\('account', raw\.id, accountKey, crmConfig\)/);
  assert.match(broker, /if \(!match\) throw new Error\('Copilot account selection is unavailable'\)/);
});

test('client DTOs and UI omit secrets and raw CRM identifiers while retaining only opaque citations', async () => {
  const detail = toCopilotAccountDetail({
    account: { id: 'account-raw-id', display_name: 'Northstar', access_token: 'secret-token' },
    contacts: [{ id: 'contact-raw-id', full_name: 'Ada', email: 'ada@example.test', phone: '+15551212', api_key: 'secret-contact-key' }],
    tasks: [{ id: 'task-raw-id', title: 'Review', assignee_id: 'user-raw-id' }],
  }, opaqueAccountKey, '2026-08-19T00:00:00.000Z');
  const serialized = JSON.stringify(detail);
  for (const forbidden of ['account-raw-id', 'contact-raw-id', 'task-raw-id', 'user-raw-id', 'secret-token', 'secret-contact-key', 'ada@example.test', '15551212']) assert.doesNotMatch(serialized, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(serialized, new RegExp(opaqueAccountKey));

  const [ui, route] = await Promise.all([source('app/copilot/CopilotWorkspace.jsx'), source('app/api/copilot/route.js')]);
  assert.match(ui, /fetch\('\/api\/copilot'/);
  assert.match(ui, /encodeURIComponent\(accountKey\)/);
  assert.doesNotMatch(ui, /serviceRoleKey|service_role|PLINKO_CORE_SERVICE_ROLE_KEY|CRM_API_TOKEN|Authorization/i);
  assert.doesNotMatch(route, /error\.message|error\.stack/);
});

test('the reviewed catalog has bounded records and run/cost ceilings, and execution refuses excess read rate', async () => {
  for (const tool of Object.values(COPILOT_TOOL_CATALOG)) assert.ok(tool.maxRecords <= 50);
  assert.equal(COPILOT_LIMITS.maxConcurrentRunsPerActor, 1);
  assert.ok(COPILOT_LIMITS.maxConcurrentRunsPerOrganization <= 4);
  assert.ok(COPILOT_LIMITS.maxReadToolCallsPerActorOrganizationPerMinute <= 10);
  assert.ok(COPILOT_LIMITS.maxInputTokensPerRun <= 8_000);
  assert.ok(COPILOT_LIMITS.maxOutputTokensPerRun <= 1_500);
  assert.ok(COPILOT_LIMITS.maxEstimatedModelCostUsdPerRun <= 0.25);
  assert.ok(COPILOT_LIMITS.maxEstimatedModelCostUsdPerOrganizationPerDay <= 10);

  const broker = await source('lib/copilot-bff.mjs');
  assert.match(broker, /events\.length >= COPILOT_LIMITS\.maxReadToolCallsPerActorOrganizationPerMinute/);
  assert.match(broker, /throw new Error\('Copilot read limit reached'\)/);
  assert.match(broker, /event_kind: 'request_denied'/);
  assert.match(broker, /denial_reason: 'Copilot request denied'/);
});
