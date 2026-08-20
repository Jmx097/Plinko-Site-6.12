# Plinko Pocket roles and capability contract

## Purpose

Plinko Pocket is the authenticated entry surface for distinct kinds of work. A verified Clerk user can have **many roles**. Roles grant a small, server-enforced set of capabilities; the browser never submits a role or permission claim.

## Current roles

| Role | Capability | Pocket experience | Deliberate exclusions |
|---|---|---|---|
| `sales` | `crm.workspace`, `stations.playbooks` | **My Work** → shared CRM; Five Stations playbooks linked to their live CRM tools | Does not grant Demo library, Pocket staff administration, provider execution, data export, send/dial/enrichment, or Hermex access. |
| `demo` | `demo.course` | **Demo course library** at `/demo` | Does not grant CRM, customer-data, approvals, staff administration, or runtime execution. |

A user can have both roles. The resulting Pocket home shows both work areas, but the Demo library remains a separate protected route.

## Authorization source of truth

- **Identity:** verified Clerk server session (`userId` / verified primary email).
- **Role assignment:** `public.member_role_assignments` in Plinko Core, keyed by Clerk subject and constrained to known role keys.
- **Role mutations:** Pocket staff-only server actions; every assignment stores `granted_by_email`.
- **Browser:** receives only rendered navigation and protected-route outcomes. It never receives a Core service key, CRM bearer token, role-assignment write API, or a generic proxy.
- **CRM transition:** existing CRM email allowlists remain a safe compatibility fallback for Jon/Kevan until their Sales assignments are recorded. New non-allowlisted CRM access requires `sales`.

## Activation sequence

1. Apply `supabase/migrations/20260819210000_pocket_roles.sql` to the designated Plinko Core project.
2. Deploy the Pocket release.
3. Sign in once with each intended member to ensure a `member_profiles` row exists.
4. From `/admin`, assign Sales, Demo, or both roles.
5. Replay: Account → My Work → CRM; Account → Demo library; then verify a Demo-only identity redirects from `/crm` to `/account`.

## Future: BYOK and provisioned Hermex

Do **not** treat a role as a credential or an instance. The future control plane should introduce separate, tenant-scoped entities:

- organization / tenant membership;
- `hermex.byok` capability (customer owns their provider key);
- `hermex.provisioned` capability (Plinko provisions a managed instance);
- an instance record with owner organization, status, region, plan, cost policy, and audit events;
- a server-only secrets boundary: a BYOK provider key must be encrypted and never rendered to a client, activity feed, CRM, or role record.

The initial commercial flow should be a **request/review/provision** workflow—not a self-service deploy button. It must validate organization scope, cost limits, approval state, lifecycle ownership, suspension/revocation, and auditability before a Hermex instance is created. Nothing in the present `sales` or `demo` role provisions a Hermex instance or grants access to runtime credentials.
