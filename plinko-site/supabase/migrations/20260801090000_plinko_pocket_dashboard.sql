-- Plinko Pocket dashboard: server-governed optional modules and native support.
-- Clerk subjects stay as text. The application service-role adapter performs writes
-- only after verifying the Clerk session (and, for grants, the server allowlist).

create table public.member_module_grants (
  id bigint generated always as identity primary key,
  user_id text not null references public.member_profiles (user_id),
  module_key text not null check (module_key in ('community', 'referrals', 'workspace')),
  enabled boolean not null default false,
  granted_by_email text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_module_grants_user_module_key unique (user_id, module_key)
);

create table public.member_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.member_profiles (user_id),
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 5000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index member_module_grants_member_idx on public.member_module_grants (user_id, enabled);
create index member_support_requests_member_idx on public.member_support_requests (user_id, created_at desc);
create index member_support_requests_triage_idx on public.member_support_requests (status, created_at desc);

create function public.set_member_dashboard_updated_at()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.set_member_dashboard_updated_at() from public;

create trigger member_module_grants_updated_at before update on public.member_module_grants
  for each row execute function public.set_member_dashboard_updated_at();
create trigger member_support_requests_updated_at before update on public.member_support_requests
  for each row execute function public.set_member_dashboard_updated_at();

alter table public.member_module_grants enable row level security;
alter table public.member_support_requests enable row level security;

-- Members can see only their safe grant and support-request records. There are
-- intentionally no member insert/update/delete policies: grants are staff-governed,
-- and support creation is accepted only through the verified server adapter.
create policy member_select_own_module_grants on public.member_module_grants for select
  using (user_id = auth.jwt() ->> 'sub');
create policy member_select_own_support_requests on public.member_support_requests for select
  using (user_id = auth.jwt() ->> 'sub');

revoke all on public.member_module_grants from anon, authenticated;
revoke all on public.member_support_requests from anon, authenticated;
grant select on public.member_module_grants to authenticated;
grant select on public.member_support_requests to authenticated;
