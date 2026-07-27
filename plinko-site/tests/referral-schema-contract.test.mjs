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
    /payout_batch_items_batch_currency_fkey foreign key \(payout_batch_id, currency\) references public\.payout_batches \(id, currency\)/,
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

test('cross-row referral, commission, and payout ownership is bound by composite database keys', () => {
  const links = tableBody('referral_links');
  assert.match(links, /unique \(id, owner_user_id\)/);

  const attributions = tableBody('referral_attributions');
  assert.match(attributions, /unique \(id, referrer_user_id, referred_user_id\)/);
  assert.match(
    attributions,
    /foreign key \(referral_link_id, referrer_user_id\) references public\.referral_links \(id, owner_user_id\)/,
    'attribution referrer must be the owner of its referral link',
  );
  assert.doesNotMatch(
    attributions,
    /foreign key \(referral_link_id\) references public\.referral_links \(id\)/,
    'an independent referral-link FK would permit a different referrer',
  );

  const entitlements = tableBody('subscription_entitlements');
  assert.match(entitlements, /unique \(id, user_id\)/);

  const ledger = tableBody('commission_ledger');
  assert.match(ledger, /unique \(id, referrer_user_id, currency\)/);
  assert.match(
    ledger,
    /foreign key \(referral_attribution_id, referrer_user_id, referred_user_id\) references public\.referral_attributions \(id, referrer_user_id, referred_user_id\)/,
    'ledger parties must match its referral attribution',
  );
  assert.match(
    ledger,
    /foreign key \(subscription_entitlement_id, referred_user_id\) references public\.subscription_entitlements \(id, user_id\)/,
    'ledger referred user must own its subscription entitlement',
  );
  assert.doesNotMatch(ledger, /foreign key \(referral_attribution_id\) references public\.referral_attributions \(id\)/);
  assert.doesNotMatch(ledger, /foreign key \(subscription_entitlement_id\) references public\.subscription_entitlements \(id\)/);

  const accounts = tableBody('payout_accounts');
  assert.match(accounts, /unique \(id, user_id\)/);
  const batches = tableBody('payout_batches');
  assert.match(batches, /unique \(id, currency\)/);

  const items = tableBody('payout_batch_items');
  assert.match(
    items,
    /foreign key \(payout_batch_id, currency\) references public\.payout_batches \(id, currency\)/,
    'item currency must match its payout batch',
  );
  assert.match(
    items,
    /foreign key \(payout_account_id, user_id\) references public\.payout_accounts \(id, user_id\)/,
    'item recipient must own its payout account',
  );
  assert.match(
    items,
    /foreign key \(commission_ledger_id, user_id, currency\) references public\.commission_ledger \(id, referrer_user_id, currency\)/,
    'item recipient and currency must match its commission ledger',
  );
  for (const independentForeignKey of [
    /foreign key \(payout_batch_id\) references public\.payout_batches \(id\)/,
    /foreign key \(payout_account_id\) references public\.payout_accounts \(id\)/,
    /foreign key \(commission_ledger_id\) references public\.commission_ledger \(id\)/,
  ]) {
    assert.doesNotMatch(items, independentForeignKey, 'independent payout FKs would permit cross-row contradictions');
  }
});

test('commission and payout amounts are derived rather than independently supplied', () => {
  const ledger = tableBody('commission_ledger');
  assert.match(
    ledger,
    /commission_cents integer generated always as \(\(eligible_net_cents::bigint \* commission_rate_bps::bigint \/ 10000\)::integer\) stored/,
    'commission cents must floor nonnegative integer cents from net amount and basis points',
  );
  assert.doesNotMatch(ledger, /commission_cents integer not null/);
  assert.match(ledger, /eligible_net_cents integer not null check \(eligible_net_cents between 0 and 2147483647\)/);

  const batches = tableBody('payout_batches');
  const items = tableBody('payout_batch_items');
  assert.doesNotMatch(batches, /\btotal_cents\b/, 'batch totals must be aggregated, not persisted');
  assert.doesNotMatch(items, /\bamount_cents\b/, 'item amount must come from the linked ledger');
  assert.match(items, /commission_ledger_id bigint unique not null/);
});

test('payout items are guarded by a narrow security-definer integrity trigger', () => {
  const accounts = tableBody('payout_accounts');
  assert.match(accounts, /status text not null check \(status in \('pending', 'active', 'disabled'\)\)/);
  assert.match(compact, /create function public\.validate_payout_batch_item\(\) returns trigger language plpgsql security definer set search_path = public/);
  assert.match(compact, /create trigger payout_batch_items_integrity_trigger before insert or update on public\.payout_batch_items/);
  assert.match(compact, /ledger_state <> 'available'/);
  assert.match(compact, /account_status <> 'active'/);
  assert.match(compact, /revoke all on function public\.validate_payout_batch_item\(\) from public/);
  assert.doesNotMatch(compact, /http|pg_net|dblink/, 'integrity trigger must not make external calls');
});

test('only safe profile and referral-link reads are member-readable', () => {
  for (const [table, policy] of [
    ['member_profiles', 'member_select_own_profile'],
    ['referral_links', 'member_select_own_referral_links'],
  ]) {
    assert.match(compact, policyFor(table, policy));
  }
  for (const table of [
    'referral_attributions',
    'commission_ledger',
    'payout_accounts',
    'payout_batches',
    'payout_batch_items',
  ]) {
    assert.doesNotMatch(
      compact,
      new RegExp(`create policy [^;]* on public\\.${table} for select`, 's'),
      `${table} contains raw referral or financial identifiers and must remain server-only`,
    );
  }
  assert.doesNotMatch(compact, /member_select_own_(referral_attributions|commissions|payout_accounts|payout_batch_items)/);
});
