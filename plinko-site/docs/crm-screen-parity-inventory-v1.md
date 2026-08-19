# Plinko CRM screen-parity inventory and acceptance matrix

Version: 1.0
Status: baseline inventory; implementation evidence is source-level except where stated otherwise.
Last reviewed: 2026-08-18 UTC.

## Scope and evidence boundary

This is an information-architecture and workflow parity target, not an EspoCRM visual or source-code copy. Plinko retains its own branding, Clerk authorization, opaque browser handles, and fail-closed non-sending campaign workflow.

Reference attempted:

- EspoCRM demo: `https://demo.espocrm.com/` returned HTTP 200 after redirecting to `https://demo.us.espocrm.com/`; its document title was `EspoCRM Demo`.
- Full interactive reference inspection is pending. The available browser harness could not launch Chromium (`chrome-not-running`), and the published user-guide endpoint returned HTTP 403. No credentials were requested, guessed, or used.

Current-product evidence was inspected in:

- `app/crm/page.jsx:1-12` — `/crm` is Clerk-protected and equal-admin scoped.
- `app/crm/CrmWorkspace.jsx:6-157` — current module, list, record, state, and interaction implementation.
- `app/api/crm/workspace/route.js:11-279` — server-only data contract, opaque handles, validation, and error contracts.
- `lib/crm-workspace.mjs:1-24` — allowed CRM operations; no provider-send operation exists.
- `app/globals.css:611-630` — responsive application shell and accessibility-visible focus styles.
- `tests/crm-readonly-command-center.test.mjs:8-98` — source-level safety and workflow assertions.

Legend: **Implemented** = present in reviewed source; **Partial** = present but behavior is incomplete or non-persistent; **Gap** = no implementation found; **Blocked** = cannot accept without live authenticated/reference-browser evidence.

## Product-wide parity contract

| Area | Espo-style workflow target | Current Plinko evidence | Status | Acceptance evidence required |
|---|---|---|---|---|
| Shell | Persistent application identity, module navigation, work canvas, contextual record navigation | Top bar, module navigation, account-home link, record breadcrumb (`CrmWorkspace.jsx:111-115,134,149`) | Implemented | Browser: navigate all modules and return to account home without losing authorization boundary. |
| List-to-record loop | Select an item from a structured list and work it in a detail canvas | Row buttons call `openRecord`; account/campaign canvases render on selection (`CrmWorkspace.jsx:79-92,100-108,127,129`) | Implemented | Authenticated browser: select account and campaign; browser Back/Forward semantics must be decided and tested. |
| Record layout | Identity header, current state, next action, related panels, tabbed detail | Account and campaign headers, tabs, side rails, related panels (`CrmWorkspace.jsx:134-157`) | Implemented | Desktop and 375 px browser checks; each tab must be keyboard reachable. |
| Global search / quick create / notifications / user menu | Global, cross-module operator affordances | Per-directory search and campaign creation only; no global search, quick-create menu, notification center, or user menu | Partial / Gap | Implement actual bounded controls or explicitly mark them out of scope. |
| URL lifecycle | Direct entity URL and browser-history preservation | One `/crm` route; module, selected record, and tab live only in React state | Gap | Define canonical URL scheme and prove direct-load, refresh, Back, Forward, and deep-link access. |
| State handling | Loading, empty, recoverable error, and mutation feedback | Busy headings, empty panels, sticky success/error notice (`CrmWorkspace.jsx:22-24,53-55,73-76,114,127-132`) | Partial | Simulate directory, record, validation, conflict, and upstream failures in a browser. |
| Responsive / keyboard | Usable dense lists and tabs at narrow widths; visible focus | Horizontal list/tab overflow and responsive breakpoints (`globals.css:615,621,625,629-630`); buttons/inputs are native controls | Partial | Keyboard traversal and narrow viewport visual test; verify no clipped primary action. |

## Screen inventory and acceptance matrix

| ID / route | Visible regions and controls | List columns / record panels | Empty, loading, error | Keyboard and URL behavior | Current status / acceptance evidence |
|---|---|---|---|---|---|
| S01 `/account` CRM entry | Operator-home identity; one `Open campaign CRM` link for authorized equal admins | N/A | CRM admins retain entry even if Pocket Core is unavailable (`app/account/page.jsx:32-48`) | Native link; URL is stable | Implemented. Acceptance: signed-out redirect; authorized admin sees CRM link; non-admin does not. |
| S02 `/crm` application shell | Plinko CRM brand; `Back to account home`; module buttons: My Work, Accounts, Contacts, Campaigns, Activities, Reports; dismissible status notice | Persistent top bar and module strip | Global busy count drives freshness/labels; success/error notice is dismissible | Module controls are native buttons. No URL state for active module. | Partial. Acceptance: all six module buttons change content; tab order/focus ring; direct `/crm` auth behavior. |
| S03 `/crm` My Work | Daily-work heading, freshness indicator, four KPI cards, `This week` work table | Account, Stage, Next action, Due, Owner, Last updated | Empty: `No work is waiting`; loading indicated by `Refreshing…` | Account name buttons open account canvas; no deep link | Partial. Evidence: `CrmWorkspace.jsx:119-127`. Gap: Due and Owner use placeholders, not authoritative fields. |
| S04 `/crm` Accounts list | Heading, search input, saved-view controls, account table | Account, Stage, Next action, Due, Owner, Last updated | Loading title `Loading accounts…`; empty table state `No work is waiting`; load failure sticky error | Search is native `type=search`, debounced 250 ms. Saved-view controls do not alter list; no URL query persistence. | Partial. Evidence: `CrmWorkspace.jsx:45-63,127-128`. Acceptance: search, empty result, 502, and saved-view filtering must be replayed. |
| S05 `/crm` Account record — Activity | Back-to-Accounts control; account header/status/last-updated; next-action card; Activity, People, Tasks, Campaigns, Details tabs; Add activity form; activity timeline; open-task side rail; account-details side rail | Panels: Add activity, Activity, Open tasks, Account details | Empty activity and no-task copy exist; record-fetch failure is sticky error | Buttons are keyboard-operable. Back returns to Accounts state rather than browser history. Tab has no URL parameter. | Partial. Evidence: `CrmWorkspace.jsx:134-146`. Acceptance: add a reversible note, create/complete a task, refresh/read-back, and verify actor attribution. |
| S06 `/crm` Account record — People | People panel; related count; person rows; Add a person disclosure/form; approval/reject/DNC controls | Person, Role, Contact state, Actions; email shown as secondary text | No explicit zero-people state inside table; disclosure remains available | Native `details`, form controls, and buttons. No person record route. | Partial. Evidence: `CrmWorkspace.jsx:147`; contract actions are bounded in `route.js:79-82,223-237`. Acceptance: approved account must not imply approved contact; DNC must remain terminal and block prohibited work. |
| S07 `/crm` Account record — Tasks | All-tasks panel, add-task toggle/form, complete control | Task title, owner, due date, status represented by control | `No tasks are open.` for side rail; no task-specific loading/error | Native controls; no task URL | Partial. Evidence: `CrmWorkspace.jsx:145`. Acceptance: create, complete, refresh/read-back and check failure notice. |
| S08 `/crm` Account record — Campaigns and Details | Related-campaign panel; Record details; account review information and decisions | Details: account status decision, source-evidence availability; review action panel | Campaigns always currently presents a no-membership empty state | Tabs are buttons; no separate URL | Partial. Evidence: `CrmWorkspace.jsx:138,148`. Gap: related memberships are not rendered; source evidence is not linkable/inspectable from this view. |
| S09 `/crm` Contacts module | Contacts heading; selected-record people table when a record is selected | Name, Account, Role, Contact state | Explicit safe empty state explains global endpoint is unavailable | No global contact search/filter or record link; no URL state | Partial. Evidence: `CrmWorkspace.jsx:105,130`. This is intentionally fail-closed rather than showing unscoped contacts. Acceptance: add dedicated scoped read endpoint before claiming global-contacts parity. |
| S10 `/crm` Campaigns list and create | Heading; search; New campaign control; inline form | Campaign, Channel, Status, People, Purpose, Updated | Loading title; empty table (not explanatory); request failure notice | Search native; New campaign toggles inline form; no URL state | Partial. Evidence: `CrmWorkspace.jsx:129`; create contract `route.js:83,208-211`. Acceptance: create reversible campaign, cancel/form errors, refresh/read-back. |
| S11 `/crm` Campaign record | Back-to-Campaigns; identity/status/channel/purpose; campaign-work summary; Overview, Members, Tasks, Drafts, Activity tabs | Overview KPI panels; Members: Person, Account, Readiness, Latest draft, Outcome; Draft/attempt cards; Activity panel | Empty member/task/draft states are explicit | Native tab buttons; no campaign deep URL; manual-only copy is visible | Partial. Evidence: `CrmWorkspace.jsx:149-157`; action allowlist `lib/crm-workspace.mjs:16-22`. Acceptance: replay non-sending lifecycle through exact gates; verify no send/export/outreach dispatch control or API operation. |
| S12 `/crm` Activities | Activities heading and timeline from selected account/campaign only | Chronological activity rows: type, body, actor, timestamp | Explicit state says to open a record first | No global activity directory, filter, pagination, or URL state | Partial. Evidence: `CrmWorkspace.jsx:106,131,144`. Acceptance: implement scoped global read endpoint before claiming full module parity. |
| S13 `/crm` Reports | Operational-report heading; four KPI cards; Data scope panel | Accounts, Pending review, Campaigns, Missing next action | N/A; KPIs derive currently loaded directories | No drill-down/filter/export/URL state | Partial. Evidence: `CrmWorkspace.jsx:107,132`. Acceptance: verify values against authoritative reporting contract; do not add export/outreach action. |
| S14 `/admin/crm`, `/admin/crm/workspace`, `/api/admin/crm/accounts/[accountId]`, `/api/crm/accounts` legacy paths | No legacy workspace UI; redirects or retirement response only | N/A | API legacy endpoints return 410 | `/admin/crm*` redirects to `/crm`; retired APIs return 410 | Implemented. Evidence: `tests/crm-readonly-command-center.test.mjs:18-22,94-98`. Acceptance: HTTP/browser redirect and 410 tests remain green. |

## Governance acceptance gates (apply to every mutable screen)

1. Account fit/intake approval, contact approval, draft approval, and manual-attempt approval remain distinct. An approved parent never implies the child approval.
2. `do_not_contact` is terminal in UI and service behavior; it cannot be bypassed by campaign membership, draft, or manual-attempt controls.
3. Draft revisions approved for one membership are immutable and cannot authorize another person, account, campaign, or attempt.
4. Browser payloads use only signed opaque handles; raw provider/database IDs, credentials, external references, and generic proxy access remain server-only.
5. Mutation attribution comes from verified server identity and the actor-signing bridge, not a browser-supplied actor header.
6. No screen, API action, export, dialer, provider-send, scheduling, or automatic outreach action may be introduced as part of parity work.

Source support: opaque-handle validation and output minimization in `app/api/crm/workspace/route.js:11-18,50-56,112-151`; allowed action list in `lib/crm-workspace.mjs:3-24`; no-send source assertions in `tests/crm-readonly-command-center.test.mjs:63-91`.

## Prioritized gaps and blockers

### P0 — release blockers for a claim of screen parity

1. Browser acceptance is not yet available: the local browser harness failed to start Chromium, and no authenticated CRM session was available for live state tests.
2. The EspoCRM reference inspection is incomplete beyond the demo endpoint availability/title. A reference-browser pass is required before calling the matrix reference-verified.
3. `/crm` has no canonical URL model for module, selected account/campaign, or selected tab. Refresh, deep links, Back, and Forward cannot currently meet normal CRM expectations.
4. Current list data is capped to the first 50 items in the UI with no pagination/load-more control; directory `nextCursor` is returned but ignored by the client.
5. Account Related campaigns and global Contacts/Activities do not have the required read contracts, so these screens deliberately show incomplete/empty state rather than pretending parity.

### P1 — workflow and quality gaps

1. Saved-view buttons do not filter or persist a selection.
2. My Work shows placeholder Due and Owner values rather than authoritative task/assignment data.
3. There is no global search, quick-create menu, notification center, or user menu.
4. Loading is largely a heading/freshness label; no row/canvas skeleton, retry affordance, or field-level validation treatment was found.
5. Reports are loaded-directory counters, not a scoped reporting contract with drill-down, freshness provenance, or role/owner aggregation.
6. Accessibility and responsive behavior have source support but no browser/assistive-technology evidence.

## Execution-ready acceptance checklist

- [ ] Reference demo inspected interactively on desktop and narrow viewport; observations appended with screenshots/recording references.
- [ ] Authorized Plinko operator replays `/account` → `/crm` → Accounts → account detail → People → Activity → Tasks → Campaigns.
- [ ] A reversible note and task are created, read back after refresh, and restored/closed; activity shows verified actor.
- [ ] A non-sending campaign journey is replayed: account → contact → campaign member → draft → draft decision → attempt decision → manual outcome; each prohibited transition fails closed.
- [ ] Direct URL, refresh, browser Back/Forward, and unauthorized route behavior are verified after a canonical route/state model is implemented.
- [ ] Empty, loading, 400, 403, 404, 409, and 502 states are captured with user-visible recovery behavior.
- [ ] Desktop and 375 px pass confirms readable tables, usable overflow, visible focus, and reachable tabs/actions.
- [ ] Regression tests pass and include each newly implemented route/state contract.

## Change control

Update the version and append dated evidence when a blocked item is replayed. Do not convert a **Partial**, **Gap**, or **Blocked** label to **Implemented** solely from a build or source inspection; it requires the listed runtime evidence.
