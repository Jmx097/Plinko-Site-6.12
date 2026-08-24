import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');

test('Copilot is a protected, full-screen prompt-playbook workspace with no write authority', async () => {
  const page = await source('app/copilot/page.jsx');
  const ui = await source('app/copilot/CopilotWorkspace.jsx');
  const css = await source('app/globals.css');
  const account = await source('app/account/page.jsx');
  assert.match(page, /await auth\(\)/);
  assert.match(page, /requireCopilotWorkspaceAccess\(await currentUser\(\), userId\)/);
  assert.match(page, /redirect\('\/account'\)/);
  assert.match(ui, /'use client'/);
  assert.match(ui, /HttpAgent/);
  assert.match(ui, /url: '\/api\/copilot\/agui'/);
  assert.match(ui, /const PLAYBOOKS = \[/);
  for (const title of ['Plan today', 'Work the outbound queue', 'Prepare a call', 'Prepare a draft', 'Clear a blocker', 'Reflect on the week']) assert.match(ui, new RegExp(title));
  assert.match(ui, /function prefill\(prompt\)/);
  assert.match(ui, /copilot-command-shell/);
  assert.match(ui, /copilot-playbook-grid/);
  assert.match(ui, /aria-live="polite"/);
  assert.match(ui, /cannot approve, create, contact, send, dial, or modify CRM records/);
  assert.doesNotMatch(ui, /method:\s*'PUT'|method:\s*'PATCH'|method:\s*'DELETE'/);
  assert.match(css, /\.copilot-command-shell/);
  assert.match(css, /\.copilot-playbook-grid/);
  assert.match(css, /@media \(max-width:520px\)/);
  assert.match(account, /href="\/copilot"/);
  assert.match(account, /href="\/crm\?module=stations"/);
});
