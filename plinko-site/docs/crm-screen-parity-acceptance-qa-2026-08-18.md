# EspoCRM screen-parity acceptance QA — evidence report

Date: 2026-08-18T19:05:00Z
Scope: independent acceptance check of the approved parity inventory (`docs/crm-screen-parity-inventory-v1.md`) and its protected local implementation. No deployment, activation, account creation, or CRM mutation was performed.

## Verdict

**FAIL — do not promote or describe this build as screen-parity accepted.**

The source and focused regression suite show substantial implementation coverage and preserve the non-sending governance boundary, but the release gate requires authenticated browser acceptance and that evidence is unavailable. The approved inventory is also materially stale relative to the current surface, which prevents a defensible claim that *every* in-scope screen has been accepted.

## Evidence summary

| Check | Result | Evidence |
|---|---|---|
| Focused CRM regression suite | PASS | `node --test tests/crm-*.test.mjs`: 43 passed, 0 failed, 0 skipped. This covers opaque handles, separate approval gates, terminal DNC, signed actor attribution, URL state, legacy retirement, module coverage, and no-send assertions. |
| Static source syntax / whitespace | PASS | `node --check app/api/crm/workspace/route.js`; `node --check lib/crm-workspace.mjs`; `git diff --check` all exited 0. |
| Production build | BLOCKED | `npm run build` compiled successfully, then failed while prerendering `/_not-found`: Clerk publishable key is absent in this local environment. |
| Signed-out `/crm` document boundary | PASS | Local HTTP `GET /crm` returned `307 Location: /sign-in`. `app/crm/page.jsx:7-11` also checks session and equal-admin authorization. |
| Signed-out CRM API boundary | PASS | Local `GET /api/crm/workspace?directory=accounts` returned `403`; the route returns `Staff access required` when no verified CRM actor is available (`app/api/crm/workspace/route.js:363-365`). |
| Legacy API retirement | PASS | Local `GET /api/admin/crm/accounts/example` returned `410`; source is asserted in `tests/crm-readonly-command-center.test.mjs:341-345`. |
| Legacy workspace convergence | PARTIAL | Local `/admin/crm` and `/admin/crm/workspace` returned `307 Location: /crm`; source-level redirect assertion passes. The resulting authenticated CRM render was not exercised. |
| Browser desktop/responsive/accessibility acceptance | BLOCKED | The browser harness could not launch Chromium (`chrome-not-running`). No authenticated operator session or credentials were supplied, guessed, or used. |
| Responsive source support | SOURCE PASS ONLY | Responsive list/tab overflow and narrow layouts exist at `app/globals.css:623-640`; this is not visual/runtime evidence at 375 px. |

## Approved inventory status

The inventory at `docs/crm-screen-parity-inventory-v1.md:39-56` specifies S01–S14. Status below distinguishes source/regression evidence from authenticated browser evidence.

| ID | Screen / route | Result | Evidence / remaining acceptance gap |
|---|---|---|---|
| S01 | `/account` CRM entry | FAIL (local signed-out path) | The local request returned `500`, and the dev server reported `Authenticated member session required` from `app/account/page.jsx:21-24`. The required signed-out redirect and authorized/non-admin render were not accepted. |
| S02 | `/crm` shell | PARTIAL | Source contains real module buttons, global search, shortcuts, create menu, notices, and account-home link (`CrmWorkspace.jsx:33,70-91,263-267`). Local signed-out redirect passed; authenticated module traversal and keyboard focus did not run. |
| S03 | My Work | PARTIAL | Authenticated read model, loading/error/empty states and freshness are implemented (`CrmWorkspace.jsx:271-285`; `route.js:349-360`), but no live authenticated response was available. |
| S04 | Accounts list | PARTIAL | Search, saved-view filtering, sorting and client pagination are present (`CrmWorkspace.jsx:289-300`). Search, empty, 502 and browser pagination behavior were not replayed. |
| S05 | Account record — Activity | PARTIAL | Record URL, loading/error retry, append-note command and post-command refresh are implemented (`CrmWorkspace.jsx:42-58,185-224`; `route.js:82,437-462`). No reversible persisted note/read-back or actor attribution replay occurred. |
| S06 | Account record — People | PARTIAL | Contact paths use opaque handles and terminal DNC is enforced before membership/draft/attempt paths (`route.js:273-275,446-454,471-490`); focused regression passed. Browser interaction and real data state remain unverified. |
| S07 | Account record — Tasks | PARTIAL | Create/complete commands are bounded and account-scoped (`route.js:83-84,442-445`); Tasks module and record are implemented (`CrmWorkspace.jsx:381-412`). No create/complete/refresh read-back occurred. |
| S08 | Account record — Campaigns and Details | PARTIAL | Account detail has related links and source/review detail in source; relationship regression passed. Live membership rendering and source evidence inspection were not run. |
| S09 | Contacts | PARTIAL | Current implementation exceeds the old fail-closed-only inventory: it has a scoped contacts directory and record contract (`route.js:217-251,370-374`; `CrmWorkspace.jsx:321-340`). Authentication, search and direct record replay remain blocked. |
| S10 | Campaigns list and create | PARTIAL | Source implements campaign list and bounded create command (`CrmWorkspace.jsx:319`; `route.js:89,414-416`). Form validation, cancellation and persisted create/read-back are unverified. |
| S11 | Campaign record | PARTIAL | Manual-only lifecycle and DNC checks are source-covered; no send/export/dispatch action is in the allowlist (`lib/crm-workspace.mjs:16-22`; regression suite pass). The end-to-end gate sequence was not replayed under a real session. |
| S12 | Activities | PARTIAL | A module exists but uses the selected record's activity context (`CrmWorkspace.jsx:253,448`); it is not acceptance evidence for an authoritative global activity directory. |
| S13 | Reports | PARTIAL | Read-only reports/dashboard implementation and no-export assertions are covered by focused tests; source derives from loaded authorized directories, not a verified reporting contract. No live value reconciliation occurred. |
| S14 | Legacy paths | PARTIAL | Legacy API `410` and legacy workspace redirects were verified locally, but the final `/crm` render is still session/browser-blocked. |

## Findings

### F-01 — High — approved inventory is stale relative to the implementation

The approved matrix calls S02 a six-module shell and has only S01–S14 (`crm-screen-parity-inventory-v1.md:43-56`). The current UI declares 19 modules, including Leads, Opportunities, Tasks, Calendar, Calls, Meetings, Emails, Email Templates, Documents, Knowledge Base, Target Lists, Dashboards, and Administration (`app/crm/CrmWorkspace.jsx:6-14,240-256`). Several are covered by source tests, but none is represented as an approved acceptance row. This makes “every in-scope screen” ambiguous and blocks a complete parity sign-off.

Recommendation: revise/version the inventory to enumerate every current module and explicitly classify intentionally unavailable views before another acceptance pass.

### F-02 — High — authenticated desktop, responsive, keyboard, and mutation acceptance is absent

The browser harness could not start Chrome, and no authorized test session was available. Consequently, this QA pass could not verify navigation, real focus traversal, 375 px visual behavior, direct-load/refresh/back/forward behavior, error rendering, or the required persisted non-sending note/task/campaign workflow. Source/regression evidence cannot replace this acceptance gate.

Recommendation: provide a working browser runtime and a disposable equal-admin test identity with safe fixture records; replay the inventory checklist without provider dispatch.

### F-03 — High — local signed-out `/account` does not satisfy the entry-route acceptance criterion

The local `GET /account` returned 500 and the dev runtime identified the throw at `app/account/page.jsx:24` (`Authenticated member session required`). The parity inventory requires signed-out behavior for S01 (`crm-screen-parity-inventory-v1.md:43`). This may be environment/Clerk middleware configuration rather than a production code regression, but it is a failed local acceptance observation and must be replayed against the target environment.

Recommendation: verify that the target Clerk configuration makes `/account` redirect signed-out browser documents to sign-in; if not, replace the direct throw with the product's intended signed-out redirect path.

### F-04 — Medium — local production build cannot complete

`npm run build` compiled application code, but static prerender then failed because the local Clerk publishable key is absent. This is not proof of a source defect in the protected CRM, but it blocks build-artifact and browser acceptance in this workspace.

Recommendation: use the intended non-secret test/preview configuration or rely on a verified remote build receipt, then repeat browser acceptance. Do not expose or commit secrets to resolve this.

## Governance outcome

Source and regression checks support these fail-closed constraints:

- separate account, contact, draft, and attempt approval states;
- terminal DNC enforcement (`app/api/crm/workspace/route.js:273-275`);
- opaque browser handles and server-side resolution (`app/api/crm/workspace/route.js:14-15,51-56,136-142`);
- verified actor path and no browser-supplied CRM identity (`app/api/crm/workspace/route.js:26-34`);
- no provider send, dispatch, dialer, schedule, or export operation in `lib/crm-workspace.mjs:3-24`.

No mutation was made during this QA run, so these are source/regression findings only, not live workflow evidence.

## Recommendation

Keep the release in **acceptance-blocked** status. Resolve F-01 by approving a current inventory, then resolve F-02/F-03/F-04 with a configured preview/test environment and a real browser session. Repeat the complete non-sending operator path and capture desktop plus 375 px evidence before any parity or production-readiness claim.
