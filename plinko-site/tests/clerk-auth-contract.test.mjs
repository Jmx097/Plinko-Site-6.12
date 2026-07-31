import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('Clerk is installed as the authentication provider', async () => {
  const packageJson = JSON.parse(await source('package.json'));
  assert.ok(packageJson.dependencies?.['@clerk/nextjs'], '@clerk/nextjs must be a production dependency');
});

test('the root layout uses ClerkProvider', async () => {
  const layout = await source('app/layout.jsx');
  assert.match(layout, /import\s*{\s*ClerkProvider\s*}\s*from\s*['"]@clerk\/nextjs['"]/);
  assert.match(layout, /<ClerkProvider[\s>]/);
});

test('middleware protects only the account route through Clerk', async () => {
  const middleware = await source('middleware.js');
  assert.match(middleware, /clerkMiddleware/);
  assert.match(middleware, /createRouteMatcher/);
  assert.match(middleware, /['"]\/account\(\.\*\)['"]/);
  assert.match(middleware, /auth\.protect\(\)/);
  assert.match(middleware, /matcher:/);
  assert.doesNotMatch(middleware, /['"]\/\(\.\*\)['"]/);
});

test('Clerk hosts sign-in and sign-up flows', async () => {
  const signIn = await source('app/sign-in/[[...sign-in]]/page.jsx');
  const signUp = await source('app/sign-up/[[...sign-up]]/page.jsx');

  assert.match(signIn, /import\s*{\s*SignIn\s*}\s*from\s*['"]@clerk\/nextjs['"]/);
  assert.match(signIn, /<SignIn[\s>]/);
  assert.match(signIn, /forceRedirectUrl=['"]\/account['"]/);
  assert.match(signUp, /import\s*{\s*SignUp\s*}\s*from\s*['"]@clerk\/nextjs['"]/);
  assert.match(signUp, /<SignUp[\s>]/);
  assert.match(signUp, /forceRedirectUrl=['"]\/account['"]/);
});

test('the account page is server-rendered from Clerk user data only', async () => {
  const account = await source('app/account/page.jsx');
  assert.doesNotMatch(account, /['"]use client['"]/);
  assert.match(account, /import\s*{\s*auth,\s*currentUser\s*}\s*from\s*['"]@clerk\/nextjs\/server['"]/);
  assert.match(account, /await\s+auth\(\)/);
  assert.match(account, /await\s+currentUser\(\)/);
  assert.match(account, /firstName/);
  assert.match(account, /emailAddresses/);
  assert.match(account, /getMemberOverview/);
  assert.match(account, /Your referral link/);
  assert.match(account, /referralUrl/);
});

test('the auth slice does not introduce local credentials or privileged data access', async () => {
  const files = await Promise.all([
    source('app/layout.jsx'),
    source('middleware.js'),
    source('app/sign-in/[[...sign-in]]/page.jsx'),
    source('app/sign-up/[[...sign-up]]/page.jsx'),
    source('app/account/page.jsx'),
  ]);
  const implementation = files.join('\n');

  assert.doesNotMatch(implementation, /<input[^>]+type=['"]password['"]/i);
  assert.doesNotMatch(implementation, /PLINKO_CORE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(implementation, /auth\.users/);
  assert.doesNotMatch(implementation, /NEXT_PUBLIC_CLERK_FRONTEND_API|CLERK_SECRET_KEY/);
});
