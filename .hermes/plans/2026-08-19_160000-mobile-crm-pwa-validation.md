# Mobile CRM PWA Validation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make the validated CRM installable and reliably usable as a mobile-first Progressive Web App without adding a separate application server or weakening its existing authenticated CRM boundary.

**Architecture:** Keep the current Next.js app, Clerk session boundary, and server-only CRM broker. Add a PWA manifest, install metadata, scoped app-shell/offline support, and a phone QA checklist. Keep CRM mutations online-only until an explicit conflict-resolution and audit model is designed.

**Tech Stack:** Next.js 15, React 18, Clerk, existing server-only CRM API broker, web app manifest/service worker.

---

## Current context / assumptions

- `plinko-site/` is the existing Next.js authenticated CRM application.
- `/crm` is protected by Clerk and is only usable by equal CRM administrators.
- The CRM API remains server-only through `app/api/crm/workspace/route.js` and `lib/crm-api.mjs`; mobile work must not expose its token or actor-signing secret.
- The mobile UI must be validated against real daily operator work before any native wrapper or App Store release.

## Proposed approach

1. Ship an installable PWA as the first mobile product.
2. Make the account → people → task/activity work loop the phone acceptance target.
3. Use safe offline behavior: app shell and explanatory fallback only; no offline mutation queue.
4. Consider Capacitor/native only after the PWA passes real operator validation or native-only needs are demonstrated (push reliability, background work, camera/files, managed-device distribution).

## Step-by-step plan

### Task 1: Add PWA metadata and icons

**Objective:** Give supported mobile browsers an installable application identity.

**Files:**
- Create: `plinko-site/app/manifest.webmanifest`
- Modify: `plinko-site/app/layout.jsx`
- Create: `plinko-site/public/icons/` icon assets

**Implementation:** Define app name, short name, `display: "standalone"`, CRM start URL, theme/background colors, and 192px/512px PNG icons. Add `manifest`, Apple touch icon, theme color, and mobile-web-app metadata through Next metadata.

**Validation:**
- Run `npm run build` with only structurally valid non-secret Clerk test placeholders.
- Fetch the deployed manifest and icon assets anonymously.
- On iOS Safari and Android Chrome, confirm the app presents an Add to Home Screen path and opens to the authenticated CRM route after install.

### Task 2: Add a deliberately limited offline experience

**Objective:** Avoid a blank/error page when connectivity drops without implying CRM writes were stored.

**Files:**
- Create: `plinko-site/public/sw.js` or a framework-compatible service-worker source
- Create: `plinko-site/app/offline/page.jsx` if needed
- Modify: `plinko-site/app/layout.jsx`

**Implementation:** Cache only versioned static app-shell assets and a small offline screen. Explicitly do not cache CRM API responses as authoritative, queue POSTs, or replay writes.

**Validation:**
- Verify authenticated CRM reads/mutations are not served from an unsafe cache.
- In a phone/browser devtools network-offline simulation, confirm the offline state explains that live CRM data and changes require reconnecting.
- Reconnect, reload, and verify the normal authenticated CRM route recovers.

### Task 3: Establish the phone acceptance journey

**Objective:** Test usability based on actual operator work rather than an install badge.

**Files:**
- Create: `plinko-site/docs/crm-mobile-pwa-acceptance.md`
- Modify: `plinko-site/tests/crm-readonly-command-center.test.mjs` only for source-level navigation/install guards

**Implementation:** Document one test journey: sign in → My Work → open account → scan next action → open People/Activity → create a reversible internal follow-up → refresh/read-back → sign out. Include phone-width checks for install, no horizontal page overflow, navigation reachability, readable account detail, focus/touch targets, and clean console.

**Validation:**
- Execute this sequence on at least one real iPhone and one Android device where possible.
- Record outcome per criterion as verified, blocked, or failed; do not label source/build evidence as device acceptance.

### Task 4: Deploy through the existing app boundary

**Objective:** Release the PWA without adding a separate runtime or exposing CRM secrets.

**Files:**
- Modify only the PWA files above.

**Implementation:** Deploy from the existing correctly linked Next application root. Check only names/presence of the required production configuration; never print credentials.

**Validation:**
- Verify the custom app domain owns the new deployment.
- Confirm `/crm` remains protected when signed out.
- Verify manifest/icons load and the authenticated CRM flow works after install.

## Files likely to change

- `plinko-site/app/layout.jsx`
- `plinko-site/app/manifest.webmanifest`
- `plinko-site/public/icons/*`
- `plinko-site/public/sw.js`
- `plinko-site/app/offline/page.jsx`
- `plinko-site/docs/crm-mobile-pwa-acceptance.md`
- `plinko-site/tests/crm-readonly-command-center.test.mjs`

## Risks and tradeoffs

- **PWA first:** fastest route to daily phone use and immediate updates; iOS has more limited background/service-worker behavior than a native app.
- **No offline writes:** intentionally safer. An offline mutation queue would require explicit conflict handling, attribution, idempotency, and audit design.
- **Push notifications:** optional later work requiring a push service and user-consent UX; not necessary to validate core usefulness.
- **Native wrapper:** Capacitor can reuse the PWA/web code later without a separate CRM server, but requires store accounts, signing, release procedures, and device QA.

## Definition of done

- The CRM is installable from a production HTTPS URL.
- It launches with app-like chrome and retains its existing Clerk/CRM security boundary.
- A real operator completes the specified non-sending workflow on a phone and proves persistence after refresh.
- Offline behavior is honest and does not claim or attempt offline CRM writes.
