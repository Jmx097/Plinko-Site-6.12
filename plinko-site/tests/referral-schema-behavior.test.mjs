import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const migrationUrl = new URL('../supabase/migrations/20260727195000_plinko_core_referral_program.sql', import.meta.url);

async function dockerAvailable() {
  try { await execFileAsync('docker', ['info'], { timeout: 10_000 }); return true; } catch { return false; }
}
async function runDocker(container, sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'plinko'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output)));
    child.stdin.end(sql);
  });
}

// This exercises the migration in an isolated, uniquely named disposable PostgreSQL.
test('referral migration makes payout selection and settlement immutable in PostgreSQL', async (t) => {
  if (!await dockerAvailable()) return t.skip('Docker is unavailable; source contract tests remain the baseline');
  const container = `plinko-referral-${process.pid}-${randomUUID().slice(0, 8)}`;
  const migration = await readFile(migrationUrl, 'utf8');
  try {
    await execFileAsync('docker', ['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=plinko', 'postgres:16-alpine'], { timeout: 120_000 });
    // pg_isready reports the temporary init server as ready; require a real query,
    // then leave enough retry room for the entrypoint's restart into its final server.
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try { await runDocker(container, 'select 1;'); break; }
      catch (error) { if (attempt === 39) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); }
    }
    await runDocker(container, `
create schema auth;
create function auth.jwt() returns jsonb language sql stable as 'select ''{}''::jsonb';
${migration}
insert into public.member_profiles (user_id) values ('referrer'), ('referred');
insert into public.referral_links (owner_user_id, code) values ('referrer', 'ref-code');
insert into public.referral_attributions (referral_link_id, referrer_user_id, referred_user_id) values (1, 'referrer', 'referred');
insert into public.subscription_entitlements (user_id, stripe_subscription_id, stripe_customer_id, status) values ('referred', 'sub_1', 'cus_1', 'active');
insert into public.commission_ledger (referrer_user_id, referred_user_id, referral_attribution_id, subscription_entitlement_id, source_invoice_id, eligible_net_cents, currency, commission_rate_bps, term_month_number, state) values ('referrer', 'referred', 1, 1, 'in_1', 1001, 'usd', 3333, 1, 'available');
insert into public.payout_accounts (user_id, stripe_connected_account_id, status) values ('referrer', 'acct_active', 'active');
insert into public.payout_batches (currency) values ('usd'), ('usd'), ('usd');
do $$ begin
  begin update public.payout_batches set status = 'approved', approved_at = now() where id = 2; raise exception 'empty approval succeeded'; exception when raise_exception then if position('at least one item' in sqlerrm) = 0 then raise; end if; end;
  insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency, commission_cents_snapshot) values (1, 'referrer', 1, 1, 'usd', 1);
  if (select commission_cents_snapshot from public.payout_batch_items where commission_ledger_id = 1) <> 333 then raise exception 'snapshot was caller controlled'; end if;
  begin update public.commission_ledger set eligible_net_cents = 2000 where id = 1; raise exception 'selected ledger basis changed'; exception when raise_exception then if position('immutable after payout selection' in sqlerrm) = 0 then raise; end if; end;
  begin update public.commission_ledger set state = 'paid' where id = 1; raise exception 'direct selected ledger payment succeeded'; exception when raise_exception then if position('only be paid by payout batch settlement' in sqlerrm) = 0 then raise; end if; end;
  update public.payout_batches set status = 'approved', approved_at = created_at + interval '1 second' where id = 1;
  begin update public.payout_batches set status = 'submitting', submission_idempotency_key = 'idem-1', submission_claimed_at = approved_at - interval '1 second' where id = 1; raise exception 'invalid claim chronology succeeded'; exception when raise_exception then if position('requires a claimed idempotency key' in sqlerrm) = 0 then raise; end if; end;
  update public.payout_batches set status = 'submitting', submission_idempotency_key = 'idem-1', submission_claimed_at = approved_at + interval '1 second' where id = 1;
  begin update public.payout_batches set status = 'submitted', external_transfer_id = 'transfer-1', submitted_at = submission_claimed_at - interval '1 second' where id = 1; raise exception 'invalid submit chronology succeeded'; exception when raise_exception then if position('requires an external transfer' in sqlerrm) = 0 then raise; end if; end;
  update public.payout_batches set status = 'submitted', external_transfer_id = 'transfer-1', submitted_at = submission_claimed_at + interval '1 second' where id = 1;
  begin update public.payout_batches set status = 'paid', paid_at = submitted_at - interval '1 second' where id = 1; raise exception 'invalid paid chronology succeeded'; exception when raise_exception then if position('requires paid_at' in sqlerrm) = 0 then raise; end if; end;
  insert into public.commission_ledger (referrer_user_id, referred_user_id, referral_attribution_id, subscription_entitlement_id, source_invoice_id, eligible_net_cents, currency, commission_rate_bps, term_month_number, state) values ('referrer', 'referred', 1, 1, 'in_2', 2000, 'usd', 1000, 2, 'available');
  insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency) values (3, 'referrer', 1, 2, 'usd');
  update public.payout_batches set status = 'approved', approved_at = created_at + interval '1 second' where id = 3;
  begin update public.payout_batches set status = 'submitting', submission_idempotency_key = 'idem-1', submission_claimed_at = approved_at + interval '1 second' where id = 3; raise exception 'duplicate idempotency key succeeded'; exception when unique_violation then null; end;
  update public.payout_batches set status = 'submitting', submission_idempotency_key = 'idem-3', submission_claimed_at = approved_at + interval '1 second' where id = 3;
  begin update public.payout_batches set status = 'submitted', external_transfer_id = 'transfer-1', submitted_at = submission_claimed_at + interval '1 second' where id = 3; raise exception 'duplicate external transfer succeeded'; exception when unique_violation then null; end;
  update public.payout_batches set status = 'paid', paid_at = submitted_at + interval '1 second' where id = 1;
  if (select state from public.commission_ledger where id = 1) <> 'paid' then raise exception 'paid batch did not reconcile ledger'; end if;
  begin update public.payout_batches set external_transfer_id = 'transfer-2' where id = 1; raise exception 'paid metadata mutation succeeded'; exception when raise_exception then if position('immutable' in sqlerrm) = 0 then raise; end if; end;
end $$;
`);
    assert.ok(true);
  } finally {
    await execFileAsync('docker', ['rm', '-f', container], { timeout: 30_000 }).catch(() => {});
  }
});
