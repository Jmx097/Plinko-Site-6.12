import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const publicSourceFiles = [
  'app/page.jsx',
  'app/about/page.jsx',
  'app/layout.jsx',
];

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('public app source contains no legacy brand references', async () => {
  const legacyBrand = ['Her', 'mes'].join('');
  const contents = await Promise.all(publicSourceFiles.map(source));

  for (const [index, content] of contents.entries()) {
    assert.doesNotMatch(content, new RegExp(legacyBrand), publicSourceFiles[index]);
  }
});

test('core portal pages and metadata identify Plinko Pocket', async () => {
  const [home, about, layout] = await Promise.all([
    source('app/page.jsx'),
    source('app/about/page.jsx'),
    source('app/layout.jsx'),
  ]);

  assert.match(home, /Plinko Pocket/, 'homepage branding');
  assert.match(about, /Plinko Pocket/, 'about-page branding');
  assert.match(layout, /Plinko Pocket/, 'site metadata branding');
});
