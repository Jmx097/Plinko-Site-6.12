# Plinko CRM governed parity invariants

Version: 1.0
Status: implementation contract for every CRM parity screen.
Last reviewed: 2026-08-18 UTC.

## Scope and authority

This document governs the Plinko CRM browser workspace and its server-side broker. It does not authorize production activation, provider outreach, data export, dialing, email sending, LinkedIn automation, enrichment, or scheduling. The CRM service remains the authoritative lifecycle and audit store; browser UI checks are explanatory defense in depth, not a replacement for service/database enforcement.

A screen must not represent a prohibited transition as available. If required state is missing, stale, inaccessible, or contradictory, it must show the record as unavailable or blocked and omit the action. It must not infer approval from a related record, retry by changing scope, or substitute a generic success message for a rejected transition.

## Non-negotiable lifecycle invariants

| Invariant | Required enforcement | Browser contract |
| --- | --- | --- |
| Account fit/intake approval is distinct | An account decision does not authorize contact research, capture, membership, drafting, an attempt, or manual execution. | Account screens may describe only the next review step. Person-intake controls stay unavailable until the service confirms the account is approved. |
| Research approval is distinct | Account research permission is a separate service decision and never implies an individual person decision. | Surfaces without an authoritative research state show `Research authorization unavailable`; they must not expose enrichment, provider lookup, or contact-research controls. |
| Contact approval is distinct | Each contact requires its own decision after the account/research conditions. | A person row shows its own decision; account approval is never rendered as contact approval. |
| Draft approval is distinct and revision-bound | A draft decision authorizes only its immutable content, revision, membership, person, account, campaign, and channel. | A draft screen identifies the exact revision and never offers an edit-in-place path after it has been decided. Missing revision/hash/effective membership means no attempt control. |
| Manual-attempt approval is distinct | An approved draft does not authorize an attempt. Every attempt requires its own decision and rechecks all earlier gates. | The UI can only describe an approved attempt as `Ready for manual outreach`; it must not show a send, export, dial, dispatch, schedule, or automation control. |
| DNC/suppression is terminal | A `do_not_contact` disposition suppresses memberships, cancels unexecuted attempts, preserves historical executed records, and blocks later membership, draft, approval, attempt, or execution transitions. | A suppressed person is labelled `Do not contact`, with approval, DNC, membership, drafting, and attempt controls omitted. Historical activity remains readable. |
| Audit attribution is truthful | Writes use the verified server-side identity and actor-signing assertion. Browser-provided actor identity is never authoritative. | Activity renders the returned actor or a neutral `CRM` fallback; the UI never lets an operator enter or choose the audit actor. |
| No activation through parity work | The broker allowlist contains no production activation, provider send, export, dialer, LinkedIn automation, enrichment, or scheduler operation. | Every applicable screen makes the manual-only/no-dispatch boundary clear and renders unsupported operation classes unavailable rather than simulated. |

## Screen-level fail-closed states

| Surface | Required blocked state |
| --- | --- |
| Account list/detail | If account state is absent or not approved, explain that only account review is available. Do not imply contact approval or display contact-intake authority. |
| People/contact panel | If the account is not approved, omit the add-person form. If a person is DNC/suppressed, omit approve/reject/DNC buttons and show terminal-suppression copy. If contact state is absent, show `Needs review`, not `Approved`. |
| Contact/research module | Without a tenant-scoped read/research contract, show an explicit safe-empty state. Do not list unscoped contacts or offer provider lookup/enrichment. |
| Campaign membership | If account, research, or contact eligibility is unavailable, the membership action is unavailable. DNC always wins over any previous membership/draft/attempt state. |
| Drafts | If the membership, exact immutable revision, approval, or DNC state cannot be verified, do not expose attempt creation or approval. A rejected/decided draft is read-only historical evidence. |
| Manual attempts/outcomes | If exact approved attempt eligibility is unavailable, no execution affordance is displayed. Recording a human-performed outcome does not call an external provider. |
| Reports/exports | Missing scoped data renders an unavailable/empty reporting state; it never enables an export or invents metrics. |
| Error/permission/conflict | `400`, `403`, `404`, `409`, and upstream failure render a neutral failure message and preserve no optimistic mutation. The operator must reload/review authoritative state; no action is retried automatically. |

## Regression evidence

`tests/crm-governance-invariants.test.mjs` asserts the policy artifact, named action allowlist, opaque-handle/verified-actor broker boundaries, no-dispatch action surface, distinct lifecycle decision payloads, and client-side terminal-DNC/account-intake fail-closed controls. It is source-level regression coverage; backend/database transition proof remains required before production activation.

## Release gate

Before any screen is called production-ready, run the CRM regression suite and replay an authorized non-sending lifecycle against the active CRM service: account fit → research authorization → contact approval → membership → immutable draft revision → draft approval → attempt approval → manually recorded outcome. Confirm that each skipped gate, any DNC state, and every unsupported action class fails closed. Do not restart, migrate, activate, or send from this parity work without separately approved release scope.
