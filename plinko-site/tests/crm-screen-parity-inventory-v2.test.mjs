import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('v2 screen-parity inventory covers the complete current CRM module shell', async () => {
  const [inventory, workspace] = await Promise.all([
    source('docs/crm-screen-parity-inventory-v2.md'),
    source('app/crm/CrmWorkspace.jsx'),
  ]);
  const moduleMatch = workspace.match(/const MODULES = (\[[^;]+\]);/);

  assert.ok(moduleMatch, 'CRM workspace must declare its module shell');
  const modules = JSON.parse(moduleMatch[1].replaceAll("'", '"'));
  assert.equal(modules.length, 20, 'the current CRM shell has 20 modules');
  for (const module of modules) {
    assert.match(inventory, new RegExp(`\\| ${module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\|`), `inventory must explicitly classify ${module}`);
  }
});

test('v2 inventory records the supported signed-out contract and unresolved external blockers', async () => {
  const [inventory, middleware, account] = await Promise.all([
    source('docs/crm-screen-parity-inventory-v2.md'),
    source('middleware.js'),
    source('app/account/page.jsx'),
  ]);

  assert.match(middleware, /createRouteMatcher\(\['\/account\(\.\*\)'/);
  assert.match(middleware, /if \(isProtectedRoute\(req\)\) \{\s*await auth\.protect\(\);/);
  assert.match(account, /if \(!userId\) throw new Error\('Authenticated member session required'\);/);
  assert.match(inventory, /Clerk middleware is the product-standard signed-out redirect boundary/);
  assert.match(inventory, /working Chromium\/authenticated disposable session/);
  assert.match(inventory, /Clerk build-time configuration/);
});
