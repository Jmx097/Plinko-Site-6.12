import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = () => readFile(new URL('../app/crm/CrmWorkspace.jsx', import.meta.url), 'utf8');

test('My Work loads a bounded dashboard first and lazy-loads heavy CRM directories', async () => {
  const crm = await source();
  assert.match(crm, /useEffect\(\(\) => \{ loadDirectory\('accounts'\); loadDirectory\('campaigns'\); loadHomeDashboard\(\); \}, \[\]\);/);
  assert.doesNotMatch(crm, /loadDirectory\('accounts'\); loadDirectory\('campaigns'\); loadDirectory\('contacts'\); loadDirectory\('tasks'\);/);
  assert.match(crm, /module !== 'Accounts' && module !== 'Campaigns' && module !== 'Contacts'/);
});
