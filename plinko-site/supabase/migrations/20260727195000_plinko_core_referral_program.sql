-- Governed, application-owned referral-program boundary for Plinko Solutions Core.
-- Clerk subjects are stored as text; application/server workflows own all mutations.

create table public.member_profiles (
  user_id text primary key,
  created_at timestamptz not null default now()
);

create table public.referral_links (
  id bigint generated always as identity primary key,
  owner_user_id text not null,
  code text unique not null check (code ~ '^[a-z0-9][a-z0-9_-]*$'),
  created_at timestamptz not null default now(),
  constraint referral_links_owner_user_id_fkey foreign key (owner_user_id) references public.member_profiles (user_id)
);

create table public.referral_attributions (
  id bigint generated always as identity primary key,
  referral_link_id bigint not null,
  referrer_user_id text not null,
  referred_user_id text unique not null,
  capture_evidence jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint referral_attributions_referral_link_id_fkey foreign key (referral_link_id) references public.referral_links (id),
  constraint referral_attributions_referrer_user_id_fkey foreign key (referrer_user_id) references public.member_profiles (user_id),
  constraint referral_attributions_referred_user_id_fkey foreign key (referred_user_id) references public.member_profiles (user_id),
  check (referrer_user_id <> referred_user_id)
);

create table public.subscription_entitlements (
  id bigint generated always as identity primary key,
  user_id text not null,
  stripe_subscription_id text unique not null,
  stripe_customer_id text unique not null,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_entitlements_user_id_fkey foreign key (user_id) references public.member_profiles (user_id)
);

create table public.commission_ledger (
  id bigint generated always as identity primary key,
  referrer_user_id text not null,
  referred_user_id text not null,
  referral_attribution_id bigint,
  subscription_entitlement_id bigint,
  source_invoice_id text unique not null,
  eligible_net_cents integer not null check (eligible_net_cents >= 0),
  commission_cents integer not null check (commission_cents >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  commission_rate_bps integer not null check (commission_rate_bps between 0 and 10000),
  term_month_number integer not null check (term_month_number between 1 and 12),
  collection_at timestamptz,
  available_at timestamptz,
  state text check (state in ('pending', 'available', 'paid', 'reversed', 'void')) not null default 'pending',
  created_at timestamptz not null default now(),
  constraint commission_ledger_referrer_user_id_fkey foreign key (referrer_user_id) references public.member_profiles (user_id),
  constraint commission_ledger_referred_user_id_fkey foreign key (referred_user_id) references public.member_profiles (user_id),
  constraint commission_ledger_referral_attribution_id_fkey foreign key (referral_attribution_id) references public.referral_attributions (id),
  constraint commission_ledger_subscription_entitlement_id_fkey foreign key (subscription_entitlement_id) references public.subscription_entitlements (id),
  check (referrer_user_id <> referred_user_id)
);

create table public.payout_accounts (
  id bigint generated always as identity primary key,
  user_id text not null,
  stripe_connected_account_id text unique not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payout_accounts_user_id_fkey foreign key (user_id) references public.member_profiles (user_id)
);

create table public.payout_batches (
  id bigint generated always as identity primary key,
  status text not null default 'draft' check (status in ('draft', 'approved', 'submitted', 'paid', 'void')),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  total_cents integer not null default 0 check (total_cents >= 0),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.payout_batch_items (
  id bigint generated always as identity primary key,
  payout_batch_id bigint not null,
  user_id text not null,
  payout_account_id bigint not null,
  commission_ledger_id bigint unique not null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  created_at timestamptz not null default now(),
  constraint payout_batch_items_payout_batch_id_fkey foreign key (payout_batch_id) references public.payout_batches (id),
  constraint payout_batch_items_user_id_fkey foreign key (user_id) references public.member_profiles (user_id),
  constraint payout_batch_items_payout_account_id_fkey foreign key (payout_account_id) references public.payout_accounts (id),
  constraint payout_batch_items_commission_ledger_id_fkey foreign key (commission_ledger_id) references public.commission_ledger (id)
);

create table public.stripe_webhook_events (
  id bigint generated always as identity primary key,
  stripe_event_id text unique not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.program_events (
  id bigint generated always as identity primary key,
  actor_user_id text,
  subject_user_id text,
  event_type text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint program_events_actor_user_id_fkey foreign key (actor_user_id) references public.member_profiles (user_id),
  constraint program_events_subject_user_id_fkey foreign key (subject_user_id) references public.member_profiles (user_id)
);

create index referral_links_owner_user_id_idx on public.referral_links (owner_user_id);
create index referral_attributions_referrer_user_id_idx on public.referral_attributions (referrer_user_id);
create index referral_attributions_referral_link_id_idx on public.referral_attributions (referral_link_id);
create index subscription_entitlements_user_id_idx on public.subscription_entitlements (user_id);
create index commission_ledger_referrer_user_id_idx on public.commission_ledger (referrer_user_id, state, available_at);
create index commission_ledger_referred_user_id_idx on public.commission_ledger (referred_user_id);
create index payout_accounts_user_id_idx on public.payout_accounts (user_id);
create index payout_batch_items_payout_batch_id_idx on public.payout_batch_items (payout_batch_id);
create index payout_batch_items_user_id_idx on public.payout_batch_items (user_id);
create index program_events_subject_user_id_idx on public.program_events (subject_user_id, created_at desc);

alter table public.member_profiles enable row level security;
alter table public.referral_links enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.subscription_entitlements enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payout_batches enable row level security;
alter table public.payout_batch_items enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.program_events enable row level security;

create policy member_select_own_profile
  on public.member_profiles for select
  using (user_id = auth.jwt() ->> 'sub');

create policy member_select_own_referral_links
  on public.referral_links for select
  using (owner_user_id = auth.jwt() ->> 'sub');

create policy member_select_own_referral_attributions
  on public.referral_attributions for select
  using (referrer_user_id = auth.jwt() ->> 'sub');

create policy member_select_own_commissions
  on public.commission_ledger for select
  using (referrer_user_id = auth.jwt() ->> 'sub');

create policy member_select_own_payout_accounts
  on public.payout_accounts for select
  using (user_id = auth.jwt() ->> 'sub');

create policy member_select_own_payout_batch_items
  on public.payout_batch_items for select
  using (user_id = auth.jwt() ->> 'sub');
