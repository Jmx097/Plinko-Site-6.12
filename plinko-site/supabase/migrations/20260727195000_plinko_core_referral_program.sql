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
  constraint referral_links_id_owner_user_id_key unique (id, owner_user_id),
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
  constraint referral_attributions_id_referrer_referred_key unique (id, referrer_user_id, referred_user_id),
  constraint referral_attributions_link_owner_fkey foreign key (referral_link_id, referrer_user_id) references public.referral_links (id, owner_user_id),
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
  constraint subscription_entitlements_id_user_id_key unique (id, user_id),
  constraint subscription_entitlements_user_id_fkey foreign key (user_id) references public.member_profiles (user_id)
);

create table public.commission_ledger (
  id bigint generated always as identity primary key,
  referrer_user_id text not null,
  referred_user_id text not null,
  referral_attribution_id bigint not null,
  subscription_entitlement_id bigint not null,
  source_invoice_id text unique not null,
  -- Nonnegative integer division deliberately floors fractional cents toward zero.
  -- bigint intermediates keep the calculation safe for the full integer input range.
  eligible_net_cents integer not null check (eligible_net_cents between 0 and 2147483647),
  commission_cents integer generated always as ((eligible_net_cents::bigint * commission_rate_bps::bigint / 10000)::integer) stored,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  commission_rate_bps integer not null check (commission_rate_bps between 0 and 10000),
  term_month_number integer not null check (term_month_number between 1 and 12),
  collection_at timestamptz,
  available_at timestamptz,
  state text check (state in ('pending', 'available', 'paid', 'reversed', 'void')) not null default 'pending',
  created_at timestamptz not null default now(),
  constraint commission_ledger_id_referrer_currency_key unique (id, referrer_user_id, currency),
  constraint commission_ledger_referrer_user_id_fkey foreign key (referrer_user_id) references public.member_profiles (user_id),
  constraint commission_ledger_referred_user_id_fkey foreign key (referred_user_id) references public.member_profiles (user_id),
  constraint commission_ledger_attribution_parties_fkey foreign key (referral_attribution_id, referrer_user_id, referred_user_id) references public.referral_attributions (id, referrer_user_id, referred_user_id),
  constraint commission_ledger_entitlement_referred_user_fkey foreign key (subscription_entitlement_id, referred_user_id) references public.subscription_entitlements (id, user_id),
  check (referrer_user_id <> referred_user_id)
);

create table public.payout_accounts (
  id bigint generated always as identity primary key,
  user_id text not null,
  stripe_connected_account_id text unique not null,
  status text not null check (status in ('pending', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  constraint payout_accounts_id_user_id_key unique (id, user_id),
  constraint payout_accounts_user_id_fkey foreign key (user_id) references public.member_profiles (user_id)
);

create table public.payout_batches (
  id bigint generated always as identity primary key,
  status text not null default 'draft' check (status in ('draft', 'approved', 'submitted', 'paid', 'void')),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payout_batches_id_currency_key unique (id, currency)
);

create table public.payout_batch_items (
  id bigint generated always as identity primary key,
  payout_batch_id bigint not null,
  user_id text not null,
  payout_account_id bigint not null,
  commission_ledger_id bigint unique not null,
  currency text not null check (currency ~ '^[a-z]{3}$'),
  created_at timestamptz not null default now(),
  constraint payout_batch_items_user_id_fkey foreign key (user_id) references public.member_profiles (user_id),
  constraint payout_batch_items_batch_currency_fkey foreign key (payout_batch_id, currency) references public.payout_batches (id, currency),
  constraint payout_batch_items_account_owner_fkey foreign key (payout_account_id, user_id) references public.payout_accounts (id, user_id),
  constraint payout_batch_items_ledger_referrer_currency_fkey foreign key (commission_ledger_id, user_id, currency) references public.commission_ledger (id, referrer_user_id, currency)
);

-- Payout batches are an explicit state machine. Timestamps are written only by
-- their corresponding transition, so a partial update cannot create a final-looking batch.
create function public.validate_payout_batch_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' or new.approved_at is not null or new.paid_at is not null then
      raise exception 'payout batch must be created as an untimestamped draft';
    end if;
    return new;
  end if;

  if old.status in ('paid', 'void') then
    raise exception 'paid and void payout batches are immutable';
  end if;

  if new.status = old.status then
    if new.approved_at is distinct from old.approved_at
       or new.paid_at is distinct from old.paid_at then
      raise exception 'payout batch timestamps may only be set by a lifecycle transition';
    end if;
    return new;
  end if;

  if old.status = 'draft' and new.status = 'approved' then
    if new.approved_at is null or new.paid_at is not null then
      raise exception 'approved payout batch requires approved_at and no paid_at';
    end if;
  elsif old.status = 'draft' and new.status = 'void' then
    if new.approved_at is not null or new.paid_at is not null then
      raise exception 'voided draft payout batch cannot have lifecycle timestamps';
    end if;
  elsif old.status = 'approved' and new.status in ('submitted', 'void') then
    if new.approved_at is distinct from old.approved_at or new.paid_at is not null then
      raise exception 'submitted or voided approved payout batch must retain approved_at and have no paid_at';
    end if;
  elsif old.status = 'submitted' and new.status = 'paid' then
    if new.approved_at is distinct from old.approved_at or new.paid_at is null then
      raise exception 'paid payout batch must retain approved_at and set paid_at';
    end if;
  elsif old.status = 'submitted' and new.status = 'void' then
    if new.approved_at is distinct from old.approved_at or new.paid_at is not null then
      raise exception 'voided submitted payout batch must retain approved_at and have no paid_at';
    end if;
  else
    raise exception 'invalid payout batch lifecycle transition from % to %', old.status, new.status;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_payout_batch_lifecycle() from public;

create trigger payout_batches_lifecycle_trigger
before insert or update on public.payout_batches
for each row execute function public.validate_payout_batch_lifecycle();

-- This trigger only reads local relational state; it makes no external calls and stores no secrets.
create function public.validate_payout_batch_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  ledger_state text;
  account_status text;
  batch_status text;
begin
  if tg_op <> 'INSERT' then
    select status into batch_status
      from public.payout_batches
     where id = old.payout_batch_id;
    if not found or batch_status <> 'draft' then
      raise exception 'payout items may only be changed in a draft batch';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  select ledger.state, account.status, batch.status
    into ledger_state, account_status, batch_status
    from public.commission_ledger as ledger
    join public.payout_accounts as account
      on account.id = new.payout_account_id
     and account.user_id = new.user_id
    join public.payout_batches as batch
      on batch.id = new.payout_batch_id
     and batch.currency = new.currency
   where ledger.id = new.commission_ledger_id
     and ledger.referrer_user_id = new.user_id
     and ledger.currency = new.currency;

  if not found then
    raise exception 'payout item recipient, account, ledger, currency, or batch is inconsistent';
  end if;
  if batch_status <> 'draft' then
    raise exception 'payout items may only be changed in a draft batch';
  end if;
  if ledger_state <> 'available' then
    raise exception 'payout item ledger must be available';
  end if;
  if account_status <> 'active' then
    raise exception 'payout item account must be active';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_payout_batch_item() from public;

create trigger payout_batch_items_integrity_trigger
before insert or update or delete on public.payout_batch_items
for each row execute function public.validate_payout_batch_item();

create function public.prevent_payout_item_ledger_reversal()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.state is distinct from old.state
     and new.state in ('reversed', 'void')
     and exists (select 1 from public.payout_batch_items where commission_ledger_id = old.id) then
    raise exception 'commission ledger with payout item cannot be reversed or voided';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_payout_item_ledger_reversal() from public;

create trigger commission_ledger_payout_item_state_trigger
before update of state on public.commission_ledger
for each row execute function public.prevent_payout_item_ledger_reversal();

create function public.prevent_payout_item_account_deactivation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status is distinct from old.status
     and new.status <> 'active'
     and exists (select 1 from public.payout_batch_items where payout_account_id = old.id) then
    raise exception 'payout account with payout item must remain active';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_payout_item_account_deactivation() from public;

create trigger payout_accounts_payout_item_status_trigger
before update of status on public.payout_accounts
for each row execute function public.prevent_payout_item_account_deactivation();

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
