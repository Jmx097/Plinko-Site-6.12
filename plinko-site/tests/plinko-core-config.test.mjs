import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const completeEnvironment = {
  PLINKO_CORE_URL: 'https://ltrcmhxmzbwattqdeqvm.supabase.co/',
  PLINKO_CORE_SERVICE_ROLE_KEY: 'service-role-example',
  PLINKO_CORE_PUBLISHABLE_KEY: 'publishable-example',
  PLINKO_APP_URL: 'https://app.plinkosolutions.com/',
};

test('throws when Plinko Solutions Core configuration is missing', async () => {
  const { getPlinkoCoreConfig } = await import('../lib/plinko-core-config.mjs');

  assert.throws(
    () => getPlinkoCoreConfig({}),
    /Missing Plinko Solutions Core configuration/,
  );
});

test('returns normalized Plinko Solutions Core configuration', async () => {
  const { getPlinkoCoreConfig } = await import('../lib/plinko-core-config.mjs');

  assert.deepEqual(getPlinkoCoreConfig(completeEnvironment), {
    url: 'https://ltrcmhxmzbwattqdeqvm.supabase.co',
    serviceRoleKey: 'service-role-example',
    publishableKey: 'publishable-example',
    appUrl: 'https://app.plinkosolutions.com',
  });
});

test('throws when any required configuration value is missing', async () => {
  const { getPlinkoCoreConfig } = await import('../lib/plinko-core-config.mjs');

  for (const key of Object.keys(completeEnvironment)) {
    const environment = { ...completeEnvironment };
    delete environment[key];

    assert.throws(
      () => getPlinkoCoreConfig(environment),
      /Missing Plinko Solutions Core configuration/,
    );
  }
});

test('does not reference the legacy control-plane environment prefix', async () => {
  const source = await readFile(
    new URL('../lib/plinko-core-config.mjs', import.meta.url),
    'utf8',
  );

  assert.equal(source.includes('PLINKO_CONTROL_PLANE'), false);
});
