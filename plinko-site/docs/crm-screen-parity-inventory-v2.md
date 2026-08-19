# Plinko CRM screen-parity inventory and acceptance matrix

Version: 2.0
Status: current source inventory; this is not browser acceptance.
Last reviewed: 2026-08-18 UTC.
Supersedes for scope only: `crm-screen-parity-inventory-v1.md`. The v1 baseline and `crm-screen-parity-acceptance-qa-2026-08-18.md` remain preserved evidence.

## Scope and evidence boundary

This inventory records every module currently declared by `app/crm/CrmWorkspace.jsx`. It describes the Plinko CRM's product surface and fail-closed boundaries; it is not an EspoCRM source or visual copy. “Source-covered” means a reviewed implementation and focused regression coverage exist. It does not mean an authenticated browser has accepted the workflow.

The CRM remains Clerk-protected, equal-admin scoped, account/contact/draft/attempt governed, opaque-handle based, and manual/non-sending. No module authorizes provider sends, dialers, scheduling, exports, automated outreach, credentials, or a generic proxy.

## Product-standard signed-out entry contract

Clerk middleware is the product-standard signed-out redirect boundary. `middleware.js` registers `/account(.*)` as protected and calls `auth.protect()` before `app/account/page.jsx` may render. `AccountPage`'s `!userId` error is a defensive invariant for an impossible post-middleware server-render path; it is not source evidence of a divergent public redirect contract. Therefore this remediation intentionally makes no authentication change, does not weaken route protection, and does not add a local redirect that could obscure a middleware/configuration failure.

The local QA observation of a signed-out `/account` HTTP 500 remains unresolved runtime evidence, not a repaired browser acceptance. It must be replayed with a configured Clerk environment and a browser-document request.

## Current module inventory

| Module | Current surface and source boundary | Classification | Required acceptance evidence |
|---|---|---|---|
| My Work | Authenticated daily account/task/activity/campaign read model with freshness and account links. | Source-covered | Equal-admin browser loads, opens an account, refreshes, and confirms scope. |
| Accounts | Searchable, sortable, paginated account directory; account creation uses the bounded CRM command. | Source-covered | Browser search/list/record path and a non-sending create/read-back with a disposable fixture. |
| Contacts | Scoped directory and contact record views; account, contact approval, and DNC remain separate. | Source-covered | Browser record traversal plus terminal-DNC failure checks. |
| Leads | Account-backed qualification context, associations, and handoff state; no duplicate lead lifecycle. | Source-covered | Browser list/record navigation and fail-closed qualification/research handoff check. |
| Opportunities | Account-backed pipeline context; amount, probability, close date, and deal lifecycle are unavailable rather than inferred. | Source-covered with unavailable fields | Browser record navigation; retain unavailable-field labels. |
| Tasks | Account-linked directory, detail, and bounded create/complete commands. | Source-covered | Reversible task create/complete, refresh/read-back, and activity attribution. |
| Calendar | Task-only day/week/month/agenda views and internal account-task creation. | Source-covered with unavailable record types | Browser view switching and task placement; verify no external scheduling action. |
| Calls | No service record, scheduling, logging, invitee, or mutation contract. | Intentionally unavailable | Browser confirms clear unavailable state and no fabricated data/action. |
| Meetings | No service record, scheduling, invitation, logging, or mutation contract. | Intentionally unavailable | Browser confirms clear unavailable state and no fabricated data/action. |
| Emails | Read-only governed email-draft records; no mailbox synchronization or delivery. | Source-covered with unavailable delivery | Browser list/detail traversal and disabled external-delivery boundary. |
| Email Templates | Read-only draft-revision representations; publishing, editing, and dispatch are unavailable. | Source-covered with unavailable mutations | Browser list/detail traversal and unavailable-mutation labels. |
| Documents | No authenticated tenant-scoped document directory, record, upload, link, or metadata contract. | Intentionally unavailable | Browser confirms disabled controls and no data fabrication. |
| Knowledge Base | No authenticated tenant-scoped article, category, or relationship contract. | Intentionally unavailable | Browser confirms disabled controls and no data fabrication. |
| Campaigns | Campaign directory, bounded creation, record detail, memberships, drafts, and manual-attempt context. | Source-covered | Full non-sending gated lifecycle with a disposable fixture. |
| Target Lists | Campaign-backed authenticated membership queue; no independent contact store, export, or dispatch. | Source-covered | Browser list/detail traversal and membership-gate check. |
| Activities | Record-context chronological timeline; no global activity-directory contract. | Source-covered with unavailable global directory | Browser account/campaign activity review and clear empty state. |
| Reports | Read-only report library derived from authorized account/campaign directories; export and authoritative rollups are unavailable. | Source-covered with unavailable export | Browser filters/run feedback and source-value reconciliation. |
| Dashboards | Read-only recorded-work indicators with value-intended/value-practiced framing; no forecast/revenue/trend claim. | Source-covered with unavailable analytics | Browser freshness and value reconciliation against authorized directories. |
| Administration | Read-only Users, Teams, Roles & ACL, Entity Configuration, and Settings panels; no admin mutation contract. | Intentionally read-only | Browser section traversal and no writable admin affordance. |

## Route and legacy inventory

| Route / view | Classification | Required acceptance evidence |
|---|---|---|
| `/account` | Clerk-protected member/operator entry; CRM equal admins get a Core-independent CRM link. | Source-covered; runtime redirect unaccepted | Signed-out browser-document redirect to Clerk, equal-admin CRM link, and non-admin account home. |
| `/crm` | Clerk-protected equal-admin workspace with URL-backed module/search/record/tab state. | Source-covered | Signed-out redirect, authorized access, direct-load, refresh, Back, and Forward. |
| `/admin/crm` and `/admin/crm/workspace` | Legacy workspace paths converge to `/crm`. | Source-covered | HTTP and browser redirect followed by authorized render. |
| `/api/admin/crm/accounts/[accountId]` and legacy CRM APIs | Retired with explicit `410`; no legacy workspace reactivation. | Source-covered | Focused HTTP/source regression remains green. |

## Intentionally unavailable views and actions

The unavailable classifications above are deliberate product boundaries, not hidden parity claims. Current source explicitly withholds: authoritative Calls and Meetings records; Documents and Knowledge Base contracts; mailbox sync/delivery; email-template publishing/editing/dispatch; external calendar scheduling; global activity directory; opportunity financial fields; reports export/authoritative rollups; dashboard forecasts/revenue/trends; and Administration mutations. A future implementation requires an authenticated, tenant-scoped, server-authorized contract and focused regression coverage before changing a classification.

## Unresolved external blockers

1. **working Chromium/authenticated disposable session** — required for desktop, 375 px, keyboard, direct-route/history, error-state, and non-sending persistence acceptance. No credentials are requested, guessed, or stored by this work.
2. **Clerk build-time configuration** — the local production build cannot complete its prerender acceptance without a configured publishable key. Use a non-secret configured preview/test environment or an authoritative remote build receipt; do not add or commit keys locally.
3. **Signed-out `/account` runtime replay** — source establishes the correct Clerk middleware contract, but the QA's local 500 must be reproduced as a browser document under the configured environment before it can be marked accepted.

## Regression evidence

- `tests/clerk-auth-contract.test.mjs` asserts Clerk installation, route protection, and Clerk-hosted sign-in/up return paths.
- `tests/crm-account-core-outage.test.mjs` asserts equal-admin CRM entry does not wait on Pocket Core reads.
- `tests/crm-readonly-command-center.test.mjs` asserts the full module declaration and fail-closed boundaries.
- `tests/crm-screen-parity-inventory-v2.test.mjs` locks this inventory to the current 19-module declaration and records the signed-out contract/blockers.

## Acceptance rule

Do not label any source-covered module browser-accepted solely from a test suite or production build. Preserve the QA report's acceptance-blocked verdict until the external blockers are resolved and the corresponding authenticated, non-sending browser evidence is captured.
