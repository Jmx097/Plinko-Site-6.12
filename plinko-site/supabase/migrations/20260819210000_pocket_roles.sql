-- Pocket roles: a member can hold multiple server-governed roles.
-- Role definitions live in application code; this table is the authoritative,
-- auditable assignment record keyed to the verified Clerk subject.

create table public.member_role_assignments (
  id bigint generated always as identity primary key,
  user_id text not null references public.member_profiles (user_id),
  role_key text not null check (role_key in ('sales', 'demo')),
  enabled boolean not null default false,
  granted_by_email text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_role_assignments_user_role_key unique (user_id, role_key)
);

create index member_role_assignments_member_enabled_idx
  on public.member_role_assignments (user_id, enabled);

create trigger member_role_assignments_updated_at before update on public.member_role_assignments
  for each row execute function public.set_member_dashboard_updated_at();

alter table public.member_role_assignments enable row level security;

-- Members can inspect their own assigned roles, but role changes are available
-- only through the verified Pocket server adapter.
create policy member_select_own_role_assignments on public.member_role_assignments for select
  using (user_id = auth.jwt() ->> 'sub');

revoke all on public.member_role_assignments from anon, authenticated;
grant select on public.member_role_assignments to authenticated;
