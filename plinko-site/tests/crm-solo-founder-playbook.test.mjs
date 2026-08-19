import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('solo-founder playbook keeps a bounded two-hour workflow inside existing CRM modules', async () => {
  const [playbook, workspace] = await Promise.all([
    source('app/crm/SoloFounderPlaybook.jsx'),
    source('app/crm/CrmWorkspace.jsx'),
  ]);

  assert.match(workspace, /'Playbook'/);
  assert.match(workspace, /<SoloFounderPlaybook openModule=\{changeModule\}/);
  for (const duration of ['00–10', '10–40', '40–60', '60–85', '85–105', '105–120']) {
    assert.match(playbook, new RegExp(duration));
  }
  for (const destination of ['My Work', 'Accounts', 'Contacts', 'Campaigns', 'Tasks']) {
    assert.match(playbook, new RegExp(`destination: '${destination}'`));
  }
  assert.match(playbook, /does not send, dial, schedule, enrich, scrape, or dispatch/);
  assert.match(playbook, /does not grant research, contact, draft, attempt, provider, or sending authority/);
  assert.doesNotMatch(playbook, /fetch\(|method:\s*'POST'|command\(/);
});
