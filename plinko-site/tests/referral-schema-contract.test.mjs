import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const migrationPath = path.resolve(
  import.meta.dirname,
  '../supabase/migrations/20260727195000_plinko_core_referral_program.sql',
);

const sql = await readFile(migrationPath, 'utf8');
const compact = sql.toLowerCase().replace(/\s+/g, ' ');

function tableBody(table) {
  const match = compact.match(
    new RegExp(`create table public\\.${table} \\((.*?)\\);`, 's'),
  );
  assert.ok(match, `public.${table} must be created`);
  return match[1];
}

function policyFor(table, name) {
  return new RegExp(
    `create policy ${name} on public\\.${table} .*?;`,
    's',
  );
}

test('governed Plinko referral schema has the required application tables', () => {
  for (const table of [
    'member_profiles',
    'referral_links',
    'referral_attributions',
    'subscription_entitlements',
    'commission_ledger',
    'payout_accounts',
    'payout_batches',
    'payout_batch_items',
    'stripe_webhook_events',
    'program_events',
  ]) {
    tableBody(table);
    assert.match(compact, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
});

test('Clerk identities remain text subjects and member policies use JWT sub', () => {
  assert.match(tableBody('member_profiles'), /user_id text primary key/);
  assert.doesNotMatch(compact, /auth\.users/);
  assert.match(compact, /auth\.jwt\(\)\s*->>\s*'sub'/);
  assert.doesNotMatch(compact, /service[-_ ]role/);
  assert.doesNotMatch(compact, /create policy[^;]*\bfor\s+(all|insert|update|delete)[^;]*\bto\s+(anon|public)/);
});

test('referrals enforce URL-safe codes, one referred user, and no self-referral', () => {
  assert.match(tableBody('referral_links'), /code text unique/);
  assert.match(tableBody('referral_links'), /check \(code ~ '\^\[a-z0-9\]\[a-z0-9_-\]\*\$'\)/);
  const attributions = tableBody('referral_attributions');
  assert.match(attributions, /referred_user_id text unique/);
  assert.match(attributions, /check \(referrer_user_id <> referred_user_id\)/);
});

test('entitlement, commission, payout, and Stripe evidence contracts are governed', () => {
  const entitlement = tableBody('subscription_entitlements');
  assert.match(entitlement, /stripe_subscription_id text unique/);
  assert.match(entitlement, /stripe_customer_id text unique/);
  assert.match(entitlement, /current_period_end timestamptz/);

  const ledger = tableBody('commission_ledger');
  for (const column of ['eligible_net_cents integer', 'commission_cents integer', 'commission_rate_bps integer', 'collection_at timestamptz', 'available_at timestamptz']) {
    assert.match(ledger, new RegExp(column));
  }
  assert.match(ledger, /term_month_number integer not null check \(term_month_number between 1 and 12\)/);
  assert.match(ledger, /source_invoice_id text unique/);
  assert.match(ledger, /state text check \(state in \('pending', 'available', 'paid', 'reversed', 'void'\)\)/);
  for (const table of [
    'subscription_entitlements',
    'commission_ledger',
    'payout_batches',
    'stripe_webhook_events',
    'program_events',
  ]) {
    assert.doesNotMatch(
      compact,
      new RegExp(`create policy .*? on public\\.${table} for (all|insert|update|delete)`, 's'),
      `${table} must not have an end-user write policy`,
    );
  }

  const account = tableBody('payout_accounts');
  assert.match(account, /stripe_connected_account_id text unique/);
  assert.doesNotMatch(account, /\b(bank|tax_id|routing|account_number)\b/);

  assert.match(tableBody('stripe_webhook_events'), /stripe_event_id text unique/);
});

test('foreign keys and indexes support governed lookup paths', () => {
  for (const relation of [
    /referral_links_owner_user_id_fkey foreign key \(owner_user_id\) references public\.member_profiles \(user_id\)/,
    /referral_attributions_referrer_user_id_fkey foreign key \(referrer_user_id\) references public\.member_profiles \(user_id\)/,
    /subscription_entitlements_user_id_fkey foreign key \(user_id\) references public\.member_profiles \(user_id\)/,
    /commission_ledger_referrer_user_id_fkey foreign key \(referrer_user_id\) references public\.member_profiles \(user_id\)/,
    /payout_batch_items_payout_batch_id_fkey foreign key \(payout_batch_id\) references public\.payout_batches \(id\)/,
  ]) {
    assert.match(compact, relation);
  }
  for (const index of [
    'referral_links_owner_user_id_idx',
    'referral_attributions_referrer_user_id_idx',
    'subscription_entitlements_user_id_idx',
    'commission_ledger_referrer_user_id_idx',
    'payout_batch_items_payout_batch_id_idx',
  ]) {
    assert.match(compact, new RegExp(`create index ${index} on public\\.`));
  }
});

test('member-facing policies are read-only and scoped to the JWT subject', () => {
  for (const [table, policy] of [
    ['member_profiles', 'member_select_own_profile'],
    ['referral_links', 'member_select_own_referral_links'],
    ['referral_attributions', 'member_select_own_referral_attributions'],
    ['commission_ledger', 'member_select_own_commissions'],
    ['payout_accounts', 'member_select_own_payout_accounts'],
    ['payout_batch_items', 'member_select_own_payout_batch_items'],
  ]) {
    assert.match(compact, policyFor(table, policy));
  }
});
