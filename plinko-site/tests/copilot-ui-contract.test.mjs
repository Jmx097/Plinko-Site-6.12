import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('Copilot UI remains protected, interactive, and limited to the reviewed read/proposal boundary', async () => {
  const page = await source('app/copilot/page.jsx');
  const ui = await source('app/copilot/CopilotWorkspace.jsx');
  const account = await source('app/account/page.jsx');
  assert.match(page, /await auth\(\)/);
  assert.match(page, /requireCopilotWorkspaceAccess\(await currentUser\(\), userId\)/);
  assert.match(page, /redirect\('\/account'\)/);
  assert.match(ui, /'use client'/);
  assert.match(ui, /fetch\('\/api\/copilot'/);
  assert.match(ui, /tool: 'my_work'/);
  assert.match(ui, /tool: 'account_search'/);
  assert.match(ui, /tool: 'tasks'/);
  assert.match(ui, /tool: 'account_detail'/);
  assert.match(ui, /tool: 'blocked_state_explanation'/);
  assert.match(ui, /tool: 'next_action_plan'/);
  assert.match(ui, /href=\{crmLink\(accountKey\)\}/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /disabled=\{busy\}/);
  assert.match(ui, /cannot approve, create, contact, send, or modify CRM records/);
  assert.doesNotMatch(ui, /method:\s*'PUT'|method:\s*'PATCH'|method:\s*'DELETE'/);
  assert.match(account, /href="\/copilot"/);
});