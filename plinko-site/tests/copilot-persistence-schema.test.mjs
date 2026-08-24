import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const root = new URL('../', import.meta.url);
const source = (path) => readFile(new URL(path, root), 'utf8');
const migrationUrl = new URL('../supabase/migrations/20260819220000_copilot_foundation_persistence.sql', import.meta.url);
const referralMigrationUrl = new URL('../supabase/migrations/20260727195000_plinko_core_referral_program.sql', import.meta.url);

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

test('Copilot persistence source contract is tenant-scoped, bounded, server-only, and append-only', async () => {
  const sql = (await source('supabase/migrations/20260819220000_copilot_foundation_persistence.sql')).toLowerCase().replace(/\s+/g, ' ');
  for (const table of ['copilot_tenants', 'copilot_tenant_memberships', 'copilot_runs', 'copilot_actions', 'copilot_artifacts', 'copilot_run_usage', 'copilot_audit_events']) {
    assert.match(sql, new RegExp(`create table public\\.${table} \\(`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
  }
  assert.match(sql, /constraint copilot_runs_idempotency_key unique \(tenant_id, actor_user_id, policy_version, idempotency_key\)/);
  assert.match(sql, /request_fingerprint text not null check \(request_fingerprint ~ '\^\[a-f0-9\]\{64\}\$'\)/);
  assert.match(sql, /check \(octet_length\(content\) between 1 and 12000\)/);
  assert.match(sql, /action_kind text not null check \(action_kind in \('executed_read', 'proposed_plan'\)\)/);
  assert.match(sql, /risk_class text not null check \(risk_class in \('r0_read_only', 'r1_propose_only'\)\)/);
  assert.match(sql, /foreign key \(tenant_id, run_id, action_id\) references public\.copilot_actions \(tenant_id, run_id, id\)/);
  assert.match(sql, /reserved_cost_microusd integer not null check \(reserved_cost_microusd between 0 and 250000\)/);
  assert.match(sql, /create trigger copilot_artifacts_immutable_trigger/);
  assert.match(sql, /create trigger copilot_audit_events_immutable_trigger/);
  assert.match(sql, /revoke all on public\.copilot_tenants, public\.copilot_tenant_memberships, public\.copilot_runs,/);
  assert.doesNotMatch(sql, /create policy .*? on public\.copilot_.*? for (all|insert|update|delete)/);
});

test('Copilot persistence migration rejects cross-tenant references, invalid R2/R3 records, oversized artifacts, and immutable evidence mutation', async (t) => {
  if (!await dockerAvailable()) return t.skip('Docker is unavailable; source contract tests remain the baseline');
  const container = `plinko-copilot-${process.pid}-${randomUUID().slice(0, 8)}`;
  const [migration, referralMigration] = await Promise.all([readFile(migrationUrl, 'utf8'), readFile(referralMigrationUrl, 'utf8')]);
  try {
    await execFileAsync('docker', ['run', '--rm', '-d', '--name', container, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=plinko', 'postgres:16-alpine'], { timeout: 120_000 });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try { await runDocker(container, 'select 1;'); break; }
      catch (error) { if (attempt === 39) throw error; await new Promise((resolve) => setTimeout(resolve, 250)); }
    }
    const hash = 'a'.repeat(64);
    const contentHash = 'b'.repeat(64);
    await runDocker(container, `
create schema auth;
create function auth.jwt() returns jsonb language sql stable as 'select ''{}''::jsonb';
create role anon;
create role authenticated;
${referralMigration}
${migration}
insert into public.member_profiles (user_id) values ('user_one'), ('user_two');
insert into public.copilot_tenants (tenant_key) values ('tenant-alpha'), ('tenant-bravo');
insert into public.copilot_tenant_memberships (tenant_id, user_id) values (1, 'user_one'), (2, 'user_two');
insert into public.copilot_runs (tenant_id, actor_user_id, request_correlation_id, policy_version, idempotency_key, request_fingerprint, idempotency_expires_at, status)
  values (1, 'user_one', '00000000-0000-0000-0000-000000000001', 'copilot-foundation-v1', 'idem-key-alpha-0001', '${hash}', now() + interval '10 minutes', 'accepted');
insert into public.copilot_actions (tenant_id, run_id, action_kind, tool_name, risk_class, opaque_reference, input_fingerprint, status, completed_at)
  values (1, 1, 'executed_read', 'my_work', 'R0_READ_ONLY', 'opaque-record-0001', '${hash}', 'succeeded', now());
insert into public.copilot_artifacts (tenant_id, run_id, action_id, artifact_kind, policy_version, content, content_sha256, source_freshness_at)
  values (1, 1, 1, 'next_action_plan', 'copilot-foundation-v1', 'bounded proposed plan', '${contentHash}', now());
insert into public.copilot_run_usage (tenant_id, run_id, model_route, reserved_cost_microusd) values (1, 1, 'reviewed-model-route', 250000);
insert into public.copilot_audit_events (tenant_id, actor_user_id, request_correlation_id, run_id, action_id, artifact_id, policy_version, event_kind, outcome, input_fingerprint)
  values (1, 'user_one', '00000000-0000-0000-0000-000000000001', 1, 1, 1, 'copilot-foundation-v1', 'artifact_created', 'succeeded', '${hash}');
do $$ begin
  begin
    insert into public.copilot_actions (tenant_id, run_id, action_kind, tool_name, risk_class, opaque_reference, input_fingerprint, status, completed_at)
      values (2, 1, 'executed_read', 'my_work', 'R0_READ_ONLY', 'opaque-record-cross', '${hash}', 'succeeded', now());
    raise exception 'cross-tenant action succeeded';
  exception when foreign_key_violation then null; end;
  begin
    insert into public.copilot_actions (tenant_id, run_id, action_kind, tool_name, risk_class, opaque_reference, input_fingerprint, status, completed_at)
      values (1, 1, 'proposed_plan', 'next_action_plan', 'R2_REVIEW_REQUIRED', 'opaque-record-r2xx', '${hash}', 'succeeded', now());
    raise exception 'R2 action succeeded';
  exception when check_violation then null; end;
  begin
    insert into public.copilot_artifacts (tenant_id, run_id, artifact_kind, policy_version, content, content_sha256, source_freshness_at)
      values (1, 1, 'summary', 'copilot-foundation-v1', repeat('x', 12001), '${hash}', now());
    raise exception 'oversized artifact succeeded';
  exception when check_violation then null; end;
  begin update public.copilot_artifacts set content = 'rewritten' where id = 1; raise exception 'artifact mutation succeeded'; exception when raise_exception then if position('immutable' in sqlerrm) = 0 then raise; end if; end;
  begin delete from public.copilot_audit_events where id = 1; raise exception 'audit deletion succeeded'; exception when raise_exception then if position('immutable' in sqlerrm) = 0 then raise; end if; end;
  begin
    insert into public.copilot_runs (tenant_id, actor_user_id, request_correlation_id, policy_version, idempotency_key, request_fingerprint, idempotency_expires_at, status)
      values (1, 'user_one', '00000000-0000-0000-0000-000000000002', 'copilot-foundation-v1', 'idem-key-alpha-0001', '${contentHash}', now() + interval '10 minutes', 'accepted');
    raise exception 'duplicate idempotency key succeeded';
  exception when unique_violation then null; end;
end $$;
`);
    assert.ok(true);
  } finally {
    await execFileAsync('docker', ['rm', '-f', container], { timeout: 30_000 }).catch(() => {});
  }
});
