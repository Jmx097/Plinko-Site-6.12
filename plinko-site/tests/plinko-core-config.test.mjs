import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const configModuleUrl = new URL('../lib/plinko-core-config.mjs', import.meta.url);

async function loadConfigModule() {
  const source = await readFile(configModuleUrl, 'utf8');
  const nodeTestSource = source.replace("import 'server-only';\n\n", '');

  return import(`data:text/javascript,${encodeURIComponent(nodeTestSource)}`);
}

const completeEnvironment = {
  PLINKO_CORE_URL: 'https://plinko-core.example.supabase.co/',
  PLINKO_CORE_SERVICE_ROLE_KEY: 'service-role-example',
  PLINKO_CORE_PUBLISHABLE_KEY: 'publishable-example',
  PLINKO_APP_URL: 'https://app.plinkosolutions.com/',
};

test('throws when Plinko Solutions Core configuration is missing', async () => {
  const { getPlinkoCoreConfig } = await loadConfigModule();

  assert.throws(
    () => getPlinkoCoreConfig({}),
    /Missing Plinko Solutions Core configuration/,
  );
});

test('returns normalized Plinko Solutions Core configuration', async () => {
  const { getPlinkoCoreConfig } = await loadConfigModule();

  assert.deepEqual(getPlinkoCoreConfig({
    ...completeEnvironment,
    PLINKO_CORE_URL: 'https://plinko-core.example.supabase.co///',
    PLINKO_APP_URL: 'https://app.plinkosolutions.com///',
  }), {
    url: 'https://plinko-core.example.supabase.co',
    serviceRoleKey: 'service-role-example',
    publishableKey: 'publishable-example',
    appUrl: 'https://app.plinkosolutions.com',
  });
});

test('throws when a Plinko Solutions Core URL is invalid', async () => {
  const { getPlinkoCoreConfig } = await loadConfigModule();
  const invalidUrls = [
    '   ',
    'javascript:alert(1)',
    'http://example.com',
    'not a url',
  ];

  for (const key of ['PLINKO_CORE_URL', 'PLINKO_APP_URL']) {
    for (const value of invalidUrls) {
      assert.throws(
        () => getPlinkoCoreConfig({ ...completeEnvironment, [key]: value }),
        /Missing Plinko Solutions Core configuration/,
        `${key} should reject ${JSON.stringify(value)}`,
      );
    }
  }
});

test('throws when any required configuration value is missing', async () => {
  const { getPlinkoCoreConfig } = await loadConfigModule();

  for (const key of Object.keys(completeEnvironment)) {
    const environment = { ...completeEnvironment };
    delete environment[key];

    assert.throws(
      () => getPlinkoCoreConfig(environment),
      /Missing Plinko Solutions Core configuration/,
    );
  }
});

test('enforces a Next.js server-only module boundary', async () => {
  const source = await readFile(configModuleUrl, 'utf8');

  assert.match(source, /^import 'server-only';$/m);
});

test('does not reference the legacy control-plane environment prefix', async () => {
  const source = await readFile(configModuleUrl, 'utf8');

  assert.equal(source.includes('PLINKO_CONTROL_PLANE'), false);
});
