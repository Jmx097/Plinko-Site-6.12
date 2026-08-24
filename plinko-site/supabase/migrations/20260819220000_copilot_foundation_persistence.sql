-- Additive, server-owned Copilot persistence for Plinko Core.
-- CRM remains the lifecycle authority; this schema stores only tenant-scoped
-- Copilot request state, opaque references, immutable R1 artifacts, and audit.

create table public.copilot_tenants (
  id bigint generated always as identity primary key,
  tenant_key text not null unique check (tenant_key ~ '^[a-zA-Z0-9_-]{8,128}$'),
  created_at timestamptz not null default now()
);

create table public.copilot_tenant_memberships (
  tenant_id bigint not null references public.copilot_tenants (id),
  user_id text not null references public.member_profiles (user_id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (tenant_id, user_id),
  check ((active and revoked_at is null) or (not active and revoked_at is not null))
);

create table public.copilot_runs (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.copilot_tenants (id),
  actor_user_id text not null references public.member_profiles (user_id),
  request_correlation_id uuid not null,
  policy_version text not null check (policy_version = 'copilot-foundation-v1'),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 256),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  idempotency_expires_at timestamptz not null,
  status text not null check (status in ('accepted', 'running', 'succeeded', 'denied', 'failed', 'cancelled')),
  denial_reason text check (denial_reason is null or char_length(denial_reason) <= 240),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  cancellation_requested_at timestamptz,
  created_at timestamptz not null default now(),
  constraint copilot_runs_tenant_id_id_key unique (tenant_id, id),
  constraint copilot_runs_idempotency_key unique (tenant_id, actor_user_id, policy_version, idempotency_key),
  check (idempotency_expires_at > created_at),
  check ((status = 'accepted' and started_at is null and finished_at is null and denial_reason is null)
    or (status = 'running' and started_at is not null and finished_at is null and denial_reason is null)
    or (status = 'succeeded' and started_at is not null and finished_at is not null and denial_reason is null)
    or (status = 'denied' and started_at is null and finished_at is not null and denial_reason is not null)
    or (status = 'failed' and started_at is not null and finished_at is not null)
    or (status = 'cancelled' and finished_at is not null)),
  check (started_at is null or started_at >= queued_at),
  check (finished_at is null or finished_at >= queued_at),
  check (cancellation_requested_at is null or cancellation_requested_at >= queued_at)
);

create table public.copilot_actions (
  id bigint generated always as identity primary key,
  tenant_id bigint not null,
  run_id bigint not null,
  action_kind text not null check (action_kind in ('executed_read', 'proposed_plan')),
  tool_name text not null check (tool_name in ('my_work', 'account_search', 'account_detail', 'tasks', 'blocked_state_explanation', 'next_action_plan')),
  risk_class text not null check (risk_class in ('R0_READ_ONLY', 'R1_PROPOSE_ONLY')),
  opaque_reference text not null check (char_length(opaque_reference) between 16 and 512),
  input_fingerprint text not null check (input_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('proposed', 'started', 'succeeded', 'denied', 'failed', 'cancelled')),
  outcome_count integer check (outcome_count is null or outcome_count between 0 and 50),
  denial_reason text check (denial_reason is null or char_length(denial_reason) <= 240),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint copilot_actions_tenant_id_id_key unique (tenant_id, id),
  constraint copilot_actions_tenant_run_id_key unique (tenant_id, run_id, id),
  constraint copilot_actions_run_fkey foreign key (tenant_id, run_id) references public.copilot_runs (tenant_id, id),
  check ((action_kind = 'executed_read' and risk_class = 'R0_READ_ONLY')
    or (action_kind = 'proposed_plan' and risk_class = 'R1_PROPOSE_ONLY')),
  check ((status in ('proposed', 'started') and completed_at is null)
    or (status in ('succeeded', 'denied', 'failed', 'cancelled') and completed_at is not null)),
  check (completed_at is null or completed_at >= created_at)
);

create table public.copilot_artifacts (
  id bigint generated always as identity primary key,
  tenant_id bigint not null,
  run_id bigint not null,
  action_id bigint,
  artifact_kind text not null check (artifact_kind in ('next_action_plan', 'summary')),
  policy_version text not null check (policy_version = 'copilot-foundation-v1'),
  content text not null check (octet_length(content) between 1 and 12000),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  source_freshness_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint copilot_artifacts_tenant_id_id_key unique (tenant_id, id),
  constraint copilot_artifacts_run_fkey foreign key (tenant_id, run_id) references public.copilot_runs (tenant_id, id),
  constraint copilot_artifacts_action_fkey foreign key (tenant_id, run_id, action_id) references public.copilot_actions (tenant_id, run_id, id),
  constraint copilot_artifacts_unique_content unique (tenant_id, run_id, content_sha256)
);

create table public.copilot_run_usage (
  tenant_id bigint not null,
  run_id bigint not null,
  model_route text not null check (char_length(model_route) between 1 and 128),
  input_tokens integer not null default 0 check (input_tokens between 0 and 8000),
  output_tokens integer not null default 0 check (output_tokens between 0 and 1500),
  reserved_cost_microusd integer not null check (reserved_cost_microusd between 0 and 250000),
  actual_cost_microusd integer check (actual_cost_microusd between 0 and 250000),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, run_id),
  foreign key (tenant_id, run_id) references public.copilot_runs (tenant_id, id),
  check ((settled_at is null and actual_cost_microusd is null) or (settled_at is not null and actual_cost_microusd is not null))
);

create table public.copilot_audit_events (
  id bigint generated always as identity primary key,
  tenant_id bigint not null references public.copilot_tenants (id),
  actor_user_id text not null references public.member_profiles (user_id),
  request_correlation_id uuid not null,
  run_id bigint,
  action_id bigint,
  artifact_id bigint,
  policy_version text not null check (policy_version = 'copilot-foundation-v1'),
  event_kind text not null check (event_kind in ('request_accepted', 'request_denied', 'run_started', 'run_terminal', 'action_terminal', 'artifact_created', 'usage_settled')),
  outcome text not null check (outcome in ('accepted', 'denied', 'succeeded', 'failed', 'cancelled')),
  input_fingerprint text check (input_fingerprint is null or input_fingerprint ~ '^[a-f0-9]{64}$'),
  record_count integer check (record_count is null or record_count between 0 and 50),
  input_tokens integer check (input_tokens is null or input_tokens between 0 and 8000),
  output_tokens integer check (output_tokens is null or output_tokens between 0 and 1500),
  cost_microusd integer check (cost_microusd is null or cost_microusd between 0 and 250000),
  denial_reason text check (denial_reason is null or char_length(denial_reason) <= 240),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, run_id) references public.copilot_runs (tenant_id, id),
  foreign key (tenant_id, action_id) references public.copilot_actions (tenant_id, id),
  foreign key (tenant_id, artifact_id) references public.copilot_artifacts (tenant_id, id),
  check ((event_kind = 'request_denied') = (outcome = 'denied')),
  check ((outcome = 'denied') = (denial_reason is not null))
);

create index copilot_runs_tenant_status_created_idx on public.copilot_runs (tenant_id, status, created_at desc);
create index copilot_runs_actor_created_idx on public.copilot_runs (tenant_id, actor_user_id, created_at desc);
create index copilot_actions_run_created_idx on public.copilot_actions (tenant_id, run_id, created_at);
create index copilot_artifacts_run_created_idx on public.copilot_artifacts (tenant_id, run_id, created_at);
create index copilot_audit_events_correlation_idx on public.copilot_audit_events (tenant_id, request_correlation_id, created_at);

-- Artifacts and audit evidence are append-only. Run/action lifecycle rows retain only
-- bounded status accounting; a later server adapter owns all writes and transitions.
create function public.prevent_copilot_immutable_record_mutation()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
begin
  raise exception 'copilot artifacts and audit events are immutable';
end;
$$;
revoke all on function public.prevent_copilot_immutable_record_mutation() from public;

create trigger copilot_artifacts_immutable_trigger
  before update or delete on public.copilot_artifacts
  for each row execute function public.prevent_copilot_immutable_record_mutation();
create trigger copilot_audit_events_immutable_trigger
  before update or delete on public.copilot_audit_events
  for each row execute function public.prevent_copilot_immutable_record_mutation();

alter table public.copilot_tenants enable row level security;
alter table public.copilot_tenant_memberships enable row level security;
alter table public.copilot_runs enable row level security;
alter table public.copilot_actions enable row level security;
alter table public.copilot_artifacts enable row level security;
alter table public.copilot_run_usage enable row level security;
alter table public.copilot_audit_events enable row level security;

revoke all on public.copilot_tenants, public.copilot_tenant_memberships, public.copilot_runs,
  public.copilot_actions, public.copilot_artifacts, public.copilot_run_usage, public.copilot_audit_events
  from anon, authenticated;
