import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const migrationUrl = new URL(
  '../supabase/migrations/20260727195000_plinko_core_referral_program.sql',
  import.meta.url,
);

async function dockerAvailable() {
  try {
    await execFileAsync('docker', ['info'], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function runDocker(container, sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'plinko'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(output)));
    child.stdin.end(sql);
  });
}

test('referral migration enforces derived commission and payout eligibility in PostgreSQL', async (t) => {
  if (!await dockerAvailable()) {
    t.skip('Docker is unavailable; source contract tests remain the baseline');
    return;
  }

  const container = `plinko-referral-schema-${process.pid}`;
  const migration = await readFile(migrationUrl, 'utf8');
  try {
    await execFileAsync('docker', [
      'run', '--rm', '-d', '--name', container,
            '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=plinko',
      'postgres:16-alpine',
    ], { timeout: 120_000 });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        await execFileAsync('docker', ['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'plinko'], { timeout: 5_000 });
        break;
      } catch {
        if (attempt === 29) throw new Error('PostgreSQL container did not become ready');
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const sql = `
create schema auth;
create function auth.jwt() returns jsonb language sql stable as 'select ''{}''::jsonb';
${migration}

insert into public.member_profiles (user_id) values ('referrer'), ('referred');
insert into public.referral_links (owner_user_id, code) values ('referrer', 'ref-code');
insert into public.referral_attributions (referral_link_id, referrer_user_id, referred_user_id)
values (1, 'referrer', 'referred');
insert into public.subscription_entitlements (user_id, stripe_subscription_id, stripe_customer_id, status)
values ('referred', 'sub_1', 'cus_1', 'active');
insert into public.commission_ledger
  (referrer_user_id, referred_user_id, referral_attribution_id, subscription_entitlement_id, source_invoice_id, eligible_net_cents, currency, commission_rate_bps, term_month_number, state)
values ('referrer', 'referred', 1, 1, 'in_1', 1001, 'usd', 3333, 1, 'pending');

do $$
begin
  if (select commission_cents from public.commission_ledger where id = 1) <> 333 then
    raise exception 'commission formula was not derived with floor-toward-zero rounding';
  end if;
  begin
    insert into public.commission_ledger
      (referrer_user_id, referred_user_id, referral_attribution_id, subscription_entitlement_id, source_invoice_id, eligible_net_cents, commission_cents, currency, commission_rate_bps, term_month_number, state)
    values ('referrer', 'referred', 1, 1, 'in_override', 1001, 999, 'usd', 3333, 2, 'pending');
    raise exception 'generated commission override unexpectedly succeeded';
  exception when sqlstate '428C9' then null;
  end;
end;
$$;

insert into public.payout_accounts (user_id, stripe_connected_account_id, status)
values ('referrer', 'acct_active', 'active'), ('referrer', 'acct_disabled', 'disabled');
insert into public.payout_batches (currency) values ('usd'), ('usd'), ('usd');

do $$
begin
  begin
    insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency)
    values (1, 'referrer', 1, 1, 'usd');
    raise exception 'pending ledger payout unexpectedly succeeded';
  exception when raise_exception then
    if position('ledger must be available' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;

update public.commission_ledger set state = 'available' where id = 1;
do $$
begin
  begin
    insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency)
    values (1, 'referrer', 2, 1, 'usd');
    raise exception 'disabled account payout unexpectedly succeeded';
  exception when raise_exception then
    if position('account must be active' in sqlerrm) = 0 then raise; end if;
  end;
end;
$$;

insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency)
values (1, 'referrer', 1, 1, 'usd');
insert into public.commission_ledger
  (referrer_user_id, referred_user_id, referral_attribution_id, subscription_entitlement_id, source_invoice_id, eligible_net_cents, currency, commission_rate_bps, term_month_number, state)
values ('referrer', 'referred', 1, 1, 'in_2', 2000, 'usd', 1000, 2, 'available');
do $$
begin
  begin
    insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency)
    values (2, 'referrer', 1, 1, 'usd');
    raise exception 'duplicate ledger payout unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  begin
    update public.payout_batches set status = 'submitted' where id = 2;
    raise exception 'draft-to-submitted transition unexpectedly succeeded';
  exception when raise_exception then
    if position('invalid payout batch lifecycle transition' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    update public.payout_batches set status = 'approved' where id = 2;
    raise exception 'approval without timestamp unexpectedly succeeded';
  exception when raise_exception then
    if position('requires approved_at' in sqlerrm) = 0 then raise; end if;
  end;

  update public.payout_batches set status = 'approved', approved_at = now() where id = 1;
  begin
    insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency)
    values (1, 'referrer', 1, 2, 'usd');
    raise exception 'approved batch item insert unexpectedly succeeded';
  exception when raise_exception then
    if position('only be changed in a draft batch' in sqlerrm) = 0 then raise; end if;
  end;
  insert into public.payout_batch_items (payout_batch_id, user_id, payout_account_id, commission_ledger_id, currency)
  values (3, 'referrer', 1, 2, 'usd');
  begin
    update public.payout_batch_items set payout_batch_id = 1 where commission_ledger_id = 2;
    raise exception 'move into approved batch unexpectedly succeeded';
  exception when raise_exception then
    if position('only be changed in a draft batch' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    update public.payout_batch_items set created_at = created_at where commission_ledger_id = 1;
    raise exception 'approved batch item update unexpectedly succeeded';
  exception when raise_exception then
    if position('only be changed in a draft batch' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    delete from public.payout_batch_items where commission_ledger_id = 1;
    raise exception 'approved batch item delete unexpectedly succeeded';
  exception when raise_exception then
    if position('only be changed in a draft batch' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    update public.commission_ledger set state = 'reversed' where id = 1;
    raise exception 'reversal after payout item unexpectedly succeeded';
  exception when raise_exception then
    if position('cannot be reversed or voided' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    update public.commission_ledger set state = 'void' where id = 1;
    raise exception 'void after payout item unexpectedly succeeded';
  exception when raise_exception then
    if position('cannot be reversed or voided' in sqlerrm) = 0 then raise; end if;
  end;
  begin
    update public.payout_accounts set status = 'disabled' where id = 1;
    raise exception 'account disable after payout item unexpectedly succeeded';
  exception when raise_exception then
    if position('must remain active' in sqlerrm) = 0 then raise; end if;
  end;

  update public.payout_batches set status = 'approved', approved_at = now() where id = 2;
  update public.payout_batches set status = 'submitted' where id = 2;
  update public.payout_batches set status = 'paid', paid_at = now() where id = 2;
  if not exists (
    select 1 from public.payout_batches
    where id = 2 and status = 'paid' and approved_at is not null and paid_at is not null
  ) then
    raise exception 'valid payout lifecycle transition did not succeed';
  end if;
  begin
    update public.payout_batches set status = 'void' where id = 2;
    raise exception 'paid batch mutation unexpectedly succeeded';
  exception when raise_exception then
    if position('immutable' in sqlerrm) = 0 then raise; end if;
  end;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('referral_attributions', 'commission_ledger', 'payout_accounts', 'payout_batches', 'payout_batch_items')
  ) then
    raise exception 'raw-sensitive member policy unexpectedly exists';
  end if;
end;
$$;
`;
    await runDocker(container, sql);
    assert.ok(true, 'PostgreSQL enforcement checks completed');
  } finally {
    await execFileAsync('docker', ['rm', '-f', container], { timeout: 30_000 }).catch(() => {});
  }
});
