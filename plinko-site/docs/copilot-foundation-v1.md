# Plinko Pocket Copilot foundation

Version: 1.0 (`copilot-foundation-v1`)
Status: reviewed design contract; implementation intentionally limited to the pure policy catalog. No UI or model execution is authorized by this document.
Owner: Plinko Pocket / CRM governance

## Decision and scope

The Copilot is an additive, private assistant workspace for a Sales member. It must improve the normal CRM loop—orient to the account, identify the next permitted action, and prepare a bounded plan—without becoming a second CRM, a generic agent console, or a route around lifecycle controls.

`copilot.workspace` is a proposed capability layered on the existing `sales` role **and** the existing `crm.workspace` capability. It is not an independent role, a tenant-wide administrator grant, or a credential. A Sales member who lacks `copilot.workspace` receives no Copilot route or API access. Existing legacy CRM email allowlist compatibility does not implicitly grant Copilot access.

This foundation does not change `ROLE_CATALOG`, role schema, protected-route middleware, or browser navigation. Those changes require a later reviewed implementation card.

## Authority and context contract

Every Copilot request starts at a server-only Pocket boundary. The browser may provide a requested tool name, a bounded query, and a signed opaque handle previously issued for the active workspace. It must never provide or select any of the following authority facts:

- Clerk subject, verified email, role, capability, organization/tenant, actor attribution, or policy version;
- raw CRM/Core IDs, bearer tokens, service keys, model/provider keys, a CRM base URL, or a model name;
- cross-organization filters, unrestricted search criteria, or a tool path/method.

The Pocket server derives this context for each request from the verified Clerk session and authoritative memberships/assignments:

```text
CopilotContext = {
  clerkSubject, verifiedEmail, organizationId, membershipId,
  capabilities, crmScope, policyVersion, requestCorrelationId
}
```

`organizationId`, `membershipId`, and `crmScope` are server-derived. A multi-organization member must first select an organization through a server-issued signed opaque handle; the server resolves the handle, rechecks active membership, and derives the scope again. Missing, expired, ambiguous, revoked, or contradictory identity/membership/capability state fails closed with no CRM call, no artifact, and no model request.

The CRM service remains the lifecycle and audit authority. The Copilot may consume only a minimal DTO from the future Copilot BFF over the existing CRM broker. It may not query Core/CRM tables directly, forward arbitrary requests, or expose raw provider identifiers/external references. Contacts and customer information must be minimized to the named tool's display need; direct contact methods, raw notes, secrets, and unrelated organization data are excluded from model context in the initial release.

## Initial read-only tool contract

The only reviewed tool names are below. The BFF must map each name to a fixed broker operation and output DTO; it must not accept a browser-provided endpoint or action string. Every return includes `fetchedAt`, `policyVersion`, and an opaque record handle where record navigation is needed.

| Tool | Fixed source | Input | Maximum | Output purpose | Risk |
| --- | --- | --- | --- | --- | --- |
| `my_work` | CRM My Work read model | none | 50 records | current accounts, tasks, activity, and freshness | R0 |
| `account_search` | CRM account directory | query ≤ 240 characters | 25 records | scoped account matches only | R0 |
| `account_detail` | CRM account workspace | account signed opaque handle | 1 account | account, next action, tasks, approved display context, and blocked state | R0 |
| `tasks` | CRM task directory | query ≤ 240 characters | 25 records | scoped tasks and account handles | R0 |
| `blocked_state_explanation` | CRM account workspace | account signed opaque handle | 1 account | deterministic explanation of the current blocker and its owner | R0 |
| `next_action_plan` | assembled only from `account_detail` DTO | account signed opaque handle | 1 account | non-authoritative plan; no state mutation | R1 |

`next_action_plan` is a proposed artifact, not a permission. It must carry source record handles, source freshness, a policy version, an explicit statement of actions that remain unauthorized, and no claims that a skipped lifecycle gate is approved.

## Action-risk policy

| Class | Meaning | Initial policy |
| --- | --- | --- |
| R0 — read-only | bounded tenant-scoped retrieval or deterministic blocked-state explanation | allowed through the reviewed allowlist only |
| R1 — propose-only | generated summary, draft plan, or immutable proposed artifact without a mutation | allowed only after the R0 context is validated; render as proposal |
| R2 — review-required | any persisted CRM/Core mutation, approval request, task/note creation, or approval/rejection recommendation that changes a work queue | prohibited from the Copilot runtime; future work needs attributable human review and a distinct server-side command contract |
| R3 — external or irreversible | sends, dialling, LinkedIn actions, exports, enrichment, provider spend, deployment, scheduling, secrets, or deletion | prohibited |

The policy is deny-by-default: a tool, action, field, query shape, or risk class absent from this contract is rejected. The browser cannot reclassify an action. Account approval, research approval, contact approval, immutable draft approval, attempt approval, and DNC remain independently enforced by the authoritative CRM service; the Copilot may explain them but cannot infer, bypass, or execute them.

## Audit, idempotency, and retention

The future persistence lane must write an immutable audit event for every accepted and rejected Copilot request before returning a final status. Correlate Pocket request, Copilot run, tool invocation, proposed artifact, policy version, actor, organization, and CRM opaque record handles with one request correlation ID. Store tool names, bounded input fingerprints, outcome/status, counts, token/cost estimates, and denial reasons—not service keys, raw prompts containing unnecessary PII, model-provider responses, or raw CRM/Core IDs.

A client-generated idempotency key is advisory only. The server must bind it to the verified subject, organization, policy version, normalized request, and a short expiry. A duplicate returns the prior terminal result or in-progress state; a different request with the same key is rejected. Cancellation must stop queued/future work and create an audit terminal state; it must never erase the immutable audit trail.

Artifacts are immutable, tenant-scoped references. Initial R1 artifacts are capped at 12,000 UTF-8 bytes and may not contain credentials, direct contact methods, raw CRM identifiers, or unredacted provider payloads.

## Limits and cost governor

These are enforceable defaults for the initial private worker, applied before any model call and again before output/artifact persistence. An organization plan may lower them, never raise them without a new policy version and human approval.

| Limit | Default |
| --- | ---: |
| Concurrent runs per actor | 1 |
| Concurrent runs per organization | 4 |
| Run starts per actor per hour | 20 |
| Read-tool calls per actor + organization per minute | 10 |
| Input tokens per run | 8,000 |
| Output tokens per run | 1,500 |
| Artifact bytes | 12,000 |
| Estimated model cost per run | USD 0.25 |
| Estimated model cost per organization per UTC day | USD 10.00 |

Counters must be server-side, organization scoped where relevant, atomic, and fail closed when unavailable. Reserve the maximum estimated model cost before invocation; release unused reservation only after terminal accounting. Missing model pricing, token accounting, organization cost policy, or audit persistence denies the run rather than treating it as free.

## Model-routing policy

Model routing is server-owned configuration, never a request parameter. The initial route (once separately activated) may use only a reviewed provider/model allowlist selected by task class and the lowest-cost compliant model that satisfies the bounded R1 plan task. The request payload is a redacted, minimal DTO; no model provider receives secrets, bearer tokens, direct CRM/Core access, browser session data, or unrestricted customer data.

No provider may train on Copilot inputs/outputs unless an explicit future privacy review changes this policy. Route fallback may use only another allowlisted model under the same token/cost reservation and privacy contract; otherwise return a neutral unavailable result. A model output is untrusted content: validate structure/size, escape it for rendering, attach sources/freshness, and never interpret it as a command.

The Copilot runs in a dedicated private worker defined by a separate runtime-isolation contract. It must not invoke the shared/default Hermes profile, public chat, generic tool registry, shell, browser, filesystem, or a user-selected model/provider.

## Prohibited capabilities

The first release and this foundation prohibit:

- CRM/Core writes, approvals, rejections, tasks/notes, role changes, or any lifecycle transition;
- provider outreach, email/SMS/call sending, dialling, LinkedIn automation, scheduling, exports, enrichment, scraping, paid retrieval, or bulk processing;
- generic proxying, direct database access, raw CRM/Core IDs, cross-tenant reads, credentials/secrets access, or exposing service/model keys;
- external HTTP tools other than the fixed future CRM broker, code execution, shell/browser/filesystem access, webhook dispatch, worker deployment, or autonomous background runs;
- deletion, record hiding, DNC changes, account/contact research capture, financial/payment actions, or production/configuration changes;
- default Hermes, public chat, shared agent memory as a CRM source of truth, or any tool not named in the initial catalog.

## Review-to-build gate

No UI, model invocation, worker deployment, or role-catalog change is authorized until this document receives product/security review. After approval, implementation must proceed in separate bounded steps: (1) add tenant-scoped immutable run/action/artifact persistence; (2) implement a server-only BFF over the CRM broker and test scope/handle denial; (3) build a private worker with queue, cancellation, health, and budget enforcement; (4) add a protected read-only UI; (5) replay a real authorized R0/R1 workflow with audit and cost read-back. Each step must preserve the existing CRM as authoritative and keep all R2/R3 capabilities unavailable.
