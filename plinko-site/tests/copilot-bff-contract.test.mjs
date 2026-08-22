import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildBlockedStateExplanation,
  buildNextActionPlan,
  normalizeCopilotCommand,
  toCopilotAccount,
  toCopilotAccountDetail,
} from '../lib/copilot-bff-core.mjs';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('Copilot BFF accepts only reviewed tool inputs and never a browser-selected CRM path', () => {
  assert.deepEqual(normalizeCopilotCommand({ tool: 'my_work' }), { tool: 'my_work' });
  assert.deepEqual(normalizeCopilotCommand({ tool: 'account_search', query: '  Northstar  ' }), { tool: 'account_search', query: 'Northstar' });
  assert.throws(() => normalizeCopilotCommand({ tool: 'account_search', query: 'x'.repeat(241) }), /Invalid Copilot query/);
  assert.throws(() => normalizeCopilotCommand({ tool: 'account_detail', accountKey: 'not-a-handle' }), /Invalid account handle/);
  assert.throws(() => normalizeCopilotCommand({ tool: 'send_email', path: '/anything' }), /Unsupported Copilot tool/);
});

test('Copilot DTOs minimize CRM data and preserve only opaque navigation handles', () => {
  const account = toCopilotAccount({ id: 'raw-account-id', display_name: 'Northstar', source: 'manual', updated_at: '2026-08-19T00:00:00.000Z' }, () => 'account_opaque_handle');
  assert.deepEqual(account, { accountKey: 'account_opaque_handle', name: 'Northstar', status: 'Needs review', nextAction: 'Open account', updatedAt: '2026-08-19T00:00:00.000Z' });
  assert.doesNotMatch(JSON.stringify(account), /raw-account-id|source|external_reference/i);

  const detail = toCopilotAccountDetail({
    account: { display_name: 'Northstar', account_approval: 'pending' },
    next_action: { label: 'Confirm account fit', owner: 'Jon', due_at: '2026-08-20T00:00:00.000Z' },
    contacts: [{ id: 'contact-1', full_name: 'Ada', email: 'ada@example.com', phone: '+15551212' }],
    tasks: [{ id: 'task-1', title: 'Review fit', status: 'open', due_at: '2026-08-20T00:00:00.000Z' }],
  }, 'account_handle_raw-account-id', '2026-08-19T00:00:00.000Z');
  assert.deepEqual(detail.contacts, [{ name: 'Ada', title: null, status: 'Needs review' }]);
  assert.doesNotMatch(JSON.stringify(detail), /example\.com|15551212|contact-1|task-1/);
});

test('blocked explanations and plans are deterministic proposals that retain no mutation authority', () => {
  const detail = { accountKey: 'account_opaque_handle', name: 'Northstar', status: 'pending', nextAction: { label: 'Confirm account fit', owner: 'Jon', dueAt: null }, tasks: [{ title: 'Review fit', status: 'open', dueAt: null }], fetchedAt: '2026-08-19T00:00:00.000Z' };
  assert.deepEqual(buildBlockedStateExplanation(detail), { accountKey: 'account_opaque_handle', status: 'pending', explanation: 'Account review is pending. A designated human must record the next lifecycle decision before contact work can proceed.', owner: 'Jon', fetchedAt: '2026-08-19T00:00:00.000Z', policyVersion: 'copilot-foundation-v1' });
  const plan = buildNextActionPlan(detail);
  assert.equal(plan.proposal, true);
  assert.match(plan.unauthorized, /does not approve|does not create|does not send/i);
  assert.deepEqual(plan.sources, [{ accountKey: 'account_opaque_handle', fetchedAt: '2026-08-19T00:00:00.000Z' }]);
});

test('server-only Copilot route derives Clerk identity and tenant scope, uses fixed broker calls, and appends audit evidence', async () => {
  const route = await source('app/api/copilot/route.js');
  const broker = await source('lib/copilot-bff.mjs');
  const access = await source('lib/copilot-access.mjs');
  const middleware = await source('middleware.js');
  assert.match(route, /import \{ auth, currentUser \} from '@clerk\/nextjs\/server'/);
  assert.match(route, /await auth\(\)/);
  assert.match(route, /requireCopilotWorkspaceAccess\(await currentUser\(\), userId\)/);
  assert.match(route, /executeCopilotReadInternal\(/);
  assert.match(middleware, /'\/api\/copilot\(\.\*\)'/);
  assert.match(access, /access\.roles\.includes\('sales'\)/);
  assert.match(access, /access\.capabilities\.includes\(COPILOT_CAPABILITY\)/);
  assert.match(broker, /crmWorkspaceAction\('list_accounts'/);
  assert.match(broker, /crmWorkspaceAction\('account_workspace'/);
  assert.match(broker, /hasCrmRecordHandle\('account'/);
  assert.match(broker, /appendCopilotAuditEvent/);
  assert.doesNotMatch(broker, /crmRequest\(|fetch\(.*CRM_API_BASE_URL|request\.url.*path/s);
});
