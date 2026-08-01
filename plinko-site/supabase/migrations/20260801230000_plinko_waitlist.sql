-- Plinko Pocket waitlist: private capture, durable consent, bounded abuse, and atomic lifecycle evidence.

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(trim(email)) and char_length(email) between 3 and 320),
  first_name text check (char_length(first_name) <= 80),
  account_type text not null check (account_type in ('individual', 'business')),
  company text check (char_length(company) <= 160),
  desired_outcome text not null check (desired_outcome in ('learn', 'blueprints', 'both')),
  source text not null default 'portal_waitlist' check (source ~ '^[a-z0-9_-]{1,40}$'),
  referral_code text check (referral_code ~ '^[a-z0-9-]{1,100}$'),
  product_updates_consent boolean not null default true,
  consented_at timestamptz not null,
  unsubscribed_at timestamptz,
  terms_version text not null check (char_length(terms_version) between 1 and 40),
  status text not null default 'waiting' check (status in ('waiting', 'qualified', 'invited', 'joined', 'declined', 'unsubscribed')),
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_unsubscribe_consistency check (
    (status = 'unsubscribed' and product_updates_consent = false and unsubscribed_at is not null)
    or (status <> 'unsubscribed' and product_updates_consent = true and unsubscribed_at is null)
  )
);

create table public.waitlist_events (
  id bigint generated always as identity primary key,
  waitlist_entry_id uuid not null references public.waitlist_entries (id),
  event_type text not null check (event_type in ('submitted', 'status_changed', 'invitation_created', 'joined', 'unsubscribed')),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.waitlist_rate_limits (
  bucket timestamptz primary key,
  attempts integer not null check (attempts > 0),
  updated_at timestamptz not null default now()
);

create index waitlist_entries_status_created_idx on public.waitlist_entries (status, created_at desc);
create index waitlist_events_entry_created_idx on public.waitlist_events (waitlist_entry_id, created_at desc);

create function public.set_waitlist_updated_at()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function public.set_waitlist_updated_at() from public;
create trigger waitlist_entries_updated_at before update on public.waitlist_entries
  for each row execute function public.set_waitlist_updated_at();

create function public.capture_waitlist_entry(
  p_email text, p_first_name text, p_account_type text, p_company text,
  p_desired_outcome text, p_source text, p_referral_code text,
  p_product_updates_consent boolean, p_terms_version text
) returns table (id uuid)
language plpgsql security definer set search_path = pg_catalog as $$
declare v_id uuid; v_inserted integer; v_attempts integer;
begin
  perform pg_advisory_xact_lock(hashtext('plinko_waitlist_capture'));
  delete from public.waitlist_rate_limits where bucket < date_trunc('minute', now()) - interval '2 days';
  insert into public.waitlist_rate_limits (bucket, attempts) values (date_trunc('minute', now()), 1)
  on conflict (bucket) do update set attempts = waitlist_rate_limits.attempts + 1, updated_at = now()
  returning attempts into v_attempts;
  if v_attempts > 20 then return; end if;
  if p_product_updates_consent is not true then raise exception 'waitlist_consent_required'; end if;
  insert into public.waitlist_entries (email, first_name, account_type, company, desired_outcome, source, referral_code, product_updates_consent, consented_at, terms_version)
  values (lower(trim(p_email)), nullif(trim(p_first_name), ''), p_account_type, nullif(trim(p_company), ''), p_desired_outcome, p_source, nullif(p_referral_code, ''), true, now(), p_terms_version)
  on conflict (email) do nothing returning waitlist_entries.id into v_id;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then select w.id into v_id from public.waitlist_entries w where w.email = lower(trim(p_email)); end if;
  if v_inserted = 1 then
    insert into public.waitlist_events (waitlist_entry_id, event_type, event_data)
    values (v_id, 'submitted', jsonb_build_object('source', p_source, 'terms_version', p_terms_version, 'consented_at', now()));
  end if;
  return query select v_id;
end;
$$;

create function public.set_waitlist_status(p_entry_id uuid, p_status text, p_actor_email text)
returns table (id uuid, status text)
language plpgsql security definer set search_path = pg_catalog as $$
declare v_current text;
begin
  if p_status not in ('waiting', 'qualified', 'invited', 'joined', 'declined', 'unsubscribed') then raise exception 'invalid_waitlist_status'; end if;
  select w.status into v_current from public.waitlist_entries w where w.id = p_entry_id for update;
  if not found then raise exception 'waitlist_entry_not_found'; end if;
  if v_current = 'unsubscribed' and p_status <> 'unsubscribed' then raise exception 'unsubscribed_waitlist_entry_is_terminal'; end if;
  update public.waitlist_entries set
    status = p_status,
    updated_by_email = lower(trim(p_actor_email)),
    product_updates_consent = case when p_status = 'unsubscribed' then false else product_updates_consent end,
    unsubscribed_at = case when p_status = 'unsubscribed' then coalesce(unsubscribed_at, now()) else unsubscribed_at end
  where waitlist_entries.id = p_entry_id;
  insert into public.waitlist_events (waitlist_entry_id, event_type, event_data)
  values (p_entry_id, case when p_status = 'unsubscribed' then 'unsubscribed' else 'status_changed' end, jsonb_build_object('status', p_status, 'actor_email', lower(trim(p_actor_email))));
  return query select w.id, w.status from public.waitlist_entries w where w.id = p_entry_id;
end;
$$;

alter table public.waitlist_entries enable row level security;
alter table public.waitlist_events enable row level security;
alter table public.waitlist_rate_limits enable row level security;
revoke all on public.waitlist_entries from anon, authenticated, service_role;
revoke all on public.waitlist_events from anon, authenticated, service_role;
revoke all on public.waitlist_rate_limits from public, anon, authenticated, service_role;
revoke all on function public.capture_waitlist_entry(text,text,text,text,text,text,text,boolean,text) from public, anon, authenticated;
revoke all on function public.set_waitlist_status(uuid,text,text) from public, anon, authenticated;
grant select on public.waitlist_entries to service_role;
grant select on public.waitlist_events to service_role;
grant execute on function public.capture_waitlist_entry(text,text,text,text,text,text,text,boolean,text) to service_role;
grant execute on function public.set_waitlist_status(uuid,text,text) to service_role;
