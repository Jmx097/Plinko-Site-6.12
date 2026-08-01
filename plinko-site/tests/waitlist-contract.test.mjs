import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('waitlist migration is private, deduplicated, consented, and auditable', () => {
  const sql = read('../supabase/migrations/20260801230000_plinko_waitlist.sql').toLowerCase();
  for (const marker of ['create table public.waitlist_entries', 'email text not null unique', 'product_updates_consent boolean not null', "status in ('waiting', 'qualified', 'invited', 'joined', 'declined', 'unsubscribed')", 'create table public.waitlist_events', 'alter table public.waitlist_entries enable row level security', 'revoke all on public.waitlist_entries from anon, authenticated']) assert.ok(sql.includes(marker), marker);
  assert.doesNotMatch(sql, /create policy .*insert.*waitlist_entries/);
});

test('capture and lifecycle writes are atomic, rate-bounded, terminal on unsubscribe, and service-role only', () => {
  const sql = read('../supabase/migrations/20260801230000_plinko_waitlist.sql').toLowerCase();
  for (const marker of ['create function public.capture_waitlist_entry', 'pg_advisory_xact_lock', 'create table public.waitlist_rate_limits', 'if v_attempts > 20 then return', 'on conflict (email) do nothing', 'if v_inserted = 1', 'create function public.set_waitlist_status', 'unsubscribed_waitlist_entry_is_terminal', 'revoke all on public.waitlist_entries from anon, authenticated, service_role', 'grant execute on function public.capture_waitlist_entry']) assert.ok(sql.includes(marker), marker);
  assert.doesNotMatch(sql, /grant\s+(?:select,\s*)?(?:insert|update|delete)[^;]*waitlist_(?:entries|events)\s+to\s+service_role/);
  assert.match(sql, /revoke all on function public\.capture_waitlist_entry[\s\S]*from public, anon, authenticated/);
});

test('public route uses a plain server-action form and never accepts a Clerk subject', () => {
  const page = read('../app/waitlist/page.jsx'); const form = read('../app/waitlist/WaitlistForm.jsx'); const action = read('../app/waitlist/actions.js');
  assert.match(page, /Join the Pocket waitlist/); assert.match(page, /WaitlistForm/); assert.match(form, /action=\{submitWaitlist\}/);
  assert.doesNotMatch(form, /useActionState|useFormState|useSearchParams/); assert.match(action, /captureWaitlistEntry/); assert.doesNotMatch(action, /userId|clerk|auth\(/i);
  assert.match(action, /\/waitlist\?joined=1/); assert.doesNotMatch(action, /already active|entry\.status/);
});

test('staff queue is protected by the existing server allowlist', () => {
  const page = read('../app/admin/page.jsx'); const adapter = read('../lib/waitlist.mjs');
  assert.match(page, /Waitlist/); assert.match(adapter, /server-only/); assert.match(adapter, /getPlinkoCoreConfig/);
});
