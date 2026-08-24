import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('Copilot is a protected, fixed-height operating console with live CRM context and explicit write confirmation', async () => {
  const [page, ui, css, account, workspaceRoute] = await Promise.all([
    source('app/copilot/page.jsx'), source('app/copilot/CopilotWorkspace.jsx'), source('app/globals.css'), source('app/account/page.jsx'), source('app/api/crm/workspace/route.js'),
  ]);
  assert.match(page, /await auth\(\)/);
  assert.match(page, /requireCopilotWorkspaceAccess\(await currentUser\(\), userId\)/);
  assert.match(page, /redirect\('\/account'\)/);
  assert.match(ui, /'use client'/);
  assert.match(ui, /HttpAgent/);
  assert.match(ui, /url: '\/api\/copilot\/agui'/);
  for (const title of ['Plan today', 'Work the queue', 'Prepare a call', 'Clear a blocker']) assert.match(ui, new RegExp(title));
  assert.match(ui, /directory=home/);
  assert.match(ui, /\/api\/crm\/workspace/);
  for (const action of ['account_approval', 'create_task', 'create_note']) assert.match(ui, new RegExp(`'${action}'`));
  assert.match(ui, /Confirm CRM change/);
  assert.match(ui, /Confirm change/);
  assert.match(ui, /does not contact anyone, send email, dial a call, or bypass existing approval gates/);
  assert.doesNotMatch(ui, /method:\s*'PUT'|method:\s*'PATCH'|method:\s*'DELETE'/);
  assert.match(workspaceRoute, /create_account_approval/);
  assert.match(workspaceRoute, /create_note/);
  assert.match(workspaceRoute, /create_task/);
  assert.match(css, /\.copilot-console \{ height:100vh/);
  assert.match(css, /\.copilot-console-grid/);
  assert.match(css, /\.copilot-live-panel/);
  assert.match(css, /\.copilot-console\.is-gradient/);
  assert.match(account, /href="\/copilot"/);
  assert.match(account, /href="\/crm\?module=stations"/);
});
