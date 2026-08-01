import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const migrationUrl = new URL('../supabase/migrations/20260801230000_plinko_waitlist.sql', import.meta.url);
async function dockerAvailable() { try { await execFileAsync('docker', ['info'], { timeout: 10_000 }); return true; } catch { return false; } }
async function runDocker(container, sql) { return new Promise((resolve, reject) => { const child = spawn('docker', ['exec', '-i', container, 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'plinko'], { stdio: ['pipe', 'pipe', 'pipe'] }); let output=''; child.stdout.on('data', c=>{output+=c;}); child.stderr.on('data', c=>{output+=c;}); child.on('error', reject); child.on('close', code=>code===0?resolve(output):reject(new Error(output))); child.stdin.end(sql); }); }

test('waitlist migration enforces private atomic capture, bounded attempts, and terminal unsubscribe', async (t) => {
  if (!await dockerAvailable()) return t.skip('Docker unavailable');
  const container = `plinko-waitlist-${process.pid}-${randomUUID().slice(0,8)}`;
  const migration = await readFile(migrationUrl, 'utf8');
  try {
    await execFileAsync('docker', ['run','--rm','-d','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=plinko','postgres:16-alpine'], { timeout: 120_000 });
    for (let i=0;i<40;i+=1) { try { await runDocker(container,'select 1;'); break; } catch (e) { if(i===39) throw e; await new Promise(r=>setTimeout(r,250)); } }
    const extraCaptures = Array.from({length:18}, (_,i)=>`select * from public.capture_waitlist_entry('person${i}@example.com','Person','individual',null,'learn','portal_waitlist',null,true,'2026-08-01');`).join('\n');
    const output = await runDocker(container, `
create role anon; create role authenticated; create role service_role bypassrls;
${migration}
select * from public.capture_waitlist_entry('jon@example.com','Jon','individual',null,'both','homepage','ref-1',true,'2026-08-01');
select * from public.capture_waitlist_entry('jon@example.com','Attacker','business','Changed Co','learn','poison',null,true,'changed-terms');
${extraCaptures}
do $$ declare v_count integer; v_name text; v_events integer; v_blocked integer; v_id uuid; begin
  select count(*) into v_count from public.waitlist_entries;
  if v_count <> 19 then raise exception 'unexpected entry count %', v_count; end if;
  select first_name into v_name from public.waitlist_entries where email='jon@example.com';
  if v_name <> 'Jon' then raise exception 'duplicate overwrote metadata'; end if;
  select count(*) into v_events from public.waitlist_events where waitlist_entry_id=(select id from public.waitlist_entries where email='jon@example.com');
  if v_events <> 1 then raise exception 'duplicate created audit event'; end if;
  select count(*) into v_blocked from public.capture_waitlist_entry('blocked@example.com','Blocked','individual',null,'learn','portal_waitlist',null,true,'2026-08-01');
  if v_blocked <> 0 then raise exception 'rate limit did not block'; end if;
  select id into v_id from public.waitlist_entries where email='jon@example.com';
  perform public.set_waitlist_status(v_id,'unsubscribed','staff@example.com');
  if (select product_updates_consent from public.waitlist_entries where id=v_id) or (select unsubscribed_at is null from public.waitlist_entries where id=v_id) then raise exception 'unsubscribe did not withdraw consent'; end if;
  begin perform public.set_waitlist_status(v_id,'qualified','staff@example.com'); raise exception 'reopened unexpectedly'; exception when raise_exception then if position('unsubscribed_waitlist_entry_is_terminal' in sqlerrm)=0 then raise; end if; end;
  if has_function_privilege('anon','public.capture_waitlist_entry(text,text,text,text,text,text,text,boolean,text)','execute') then raise exception 'anon can execute capture'; end if;
  if has_table_privilege('service_role','public.waitlist_entries','insert') or has_table_privilege('service_role','public.waitlist_entries','update') then raise exception 'service role can bypass entry RPC'; end if;
  if has_table_privilege('service_role','public.waitlist_events','insert') then raise exception 'service role can forge audit events'; end if;
end $$;
`);
    assert.match(output, /DO/);
  } finally { await execFileAsync('docker',['rm','-f',container],{timeout:30_000}).catch(()=>{}); }
});
