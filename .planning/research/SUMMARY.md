# Project Research Summary

**Project:** La Canne a Sucre — Serverless Reservation System
**Domain:** Static restaurant website + serverless booking backend (Cloudflare Pages + Workers + D1 + Twilio SMS)
**Researched:** 2026-02-26
**Confidence:** HIGH

## Executive Summary

This project replaces an existing Go High Level iframe booking widget with a self-owned, serverless reservation system. The goal is not feature expansion — it is dependency reduction and cost reduction. The recommended architecture is Cloudflare Pages Functions (collocated with the existing static site) backed by Cloudflare D1 for storage and Twilio SMS for notifications. This approach eliminates three external dependencies (GHL, n8n, and GHL-managed Twilio routing) and reduces them to one (Twilio directly). The entire backend runs at the Cloudflare edge with zero new infrastructure cost at this restaurant's scale.

The implementation is deliberately narrow in scope. All features are P1 and implementable with a single JavaScript file (`functions/api/reservations.js`), one SQL migration, and direct `fetch()` calls to Twilio's REST API. No framework, no ORM, no build step, no SDK. The single most important architectural decision — using Pages Functions collocated on the same origin rather than a standalone Worker on a separate domain — eliminates CORS entirely and keeps both frontend and API in one deploy pipeline.

The highest risks are operational, not technical: French A2P SMS regulations (using a French mobile number as sender silently fails), SMS character encoding costs from accented characters, and the Go High Level cancellation window (phone numbers deleted 14 days after cancellation). All three must be addressed before writing a single line of application code. The codebase itself is straightforward and well-documented. Confidence in both stack and architecture is HIGH; confidence in features is HIGH given that this is a replacement system with a known, bounded scope.

---

## Key Findings

### Recommended Stack

The stack is entirely within the Cloudflare ecosystem, which the restaurant already uses. Cloudflare Pages hosts the static site; Pages Functions (file-based routing via the `/functions` directory) handles the single API endpoint at `/api/reservations`; Cloudflare D1 (managed SQLite) persists reservations. Twilio SMS is called via plain `fetch()` — no SDK is needed or compatible with the Worker runtime.

The decision to use Pages Functions rather than a standalone Worker is load-bearing: it eliminates the cross-origin boundary between the static frontend and the API, removes CORS complexity, and keeps a single deploy pipeline. TypeScript is available without a build step via Wrangler. Zod provides runtime input validation. The Twilio Node.js SDK must NOT be used — it imports Node.js built-ins not available in the Worker runtime.

**Core technologies:**
- **Cloudflare Pages Functions** (via `/functions` directory): Serverless API collocated with the static site — same origin, no CORS, no separate deploy
- **Cloudflare D1** (managed SQLite, GA): Reservation storage — same-ecosystem binding, 5M reads/day free, zero latency vs. external DB
- **Hono 4.12.2**: HTTP routing + Zod middleware — lightest opinionated router for Workers, official Cloudflare recommendation
- **Zod 4.3.6**: Runtime validation of all form payloads before D1 write or Twilio call
- **Twilio SMS** (plain `fetch()` to REST API v1): SMS confirmation to guest + notification to owner — existing account, no new service
- **Wrangler 4.68.1**: CLI for local dev, D1 migrations, secrets management, deployment
- **TypeScript 5.x**: Via Wrangler native bundling; eliminates `process.env` and binding type errors

**Critical version notes:**
- Wrangler 4 requires Node.js >= 18; v3 receives only security fixes
- `@hono/zod-validator` must support Zod 4 — verify before pinning; fall back to `zod@3` if not
- `@cloudflare/workers-types` is date-versioned — update when Wrangler updates

### Expected Features

This is a replacement system. "Table stakes" means parity with the existing GHL iframe, not parity with OpenTable.

**Must have (table stakes — all P1):**
- HTML booking form: name, phone, email, date, time slot (midi/soir), party size (1-10)
- Client-side validation: required fields, future dates, French phone format, email format
- Server-side validation (mirror of client-side) in the Pages Function
- Monday + past date blocking at both UI and server level — restaurant is closed Mondays
- Guest SMS confirmation in French — sent immediately on reservation write
- Owner SMS notification in French — full reservation details, replaces n8n workflow
- D1 reservation storage — enables future admin queries, owns the data
- Honeypot anti-spam — lightweight bot protection without CAPTCHA UX cost
- Success and error feedback in the form UI — spinner, disable button on submit, inline messages
- Staging branch workflow — test full flow (D1 + SMS) before promoting to production

**Should have (competitive advantages over GHL — also P1):**
- Owner SMS with full details (name, phone, date, creneau, party size) — owner currently must log into GHL dashboard to see this
- No iframe / native HTML form — faster page load, no GHL branding, full design control
- Custom French SMS copy — exact wording under owner control, not GHL default

**Defer to v1.x:**
- Automated reminder SMS (24h before) — requires Cron Trigger; add only if owner reports no-show problem
- Admin read endpoint (JSON listing upcoming reservations) — add only if Base44 admin app proves insufficient

**Defer to v2+:**
- Email confirmation — SMS open rate makes this redundant; add only if explicitly requested
- Online cancellation flow — doubles backend surface area; phone call is sufficient at this scale
- Capacity tracking per slot — owner manages manually; add only if overbooking becomes documented problem

**Anti-features (do not build, ever):**
- Guest accounts/login, waitlist, credit card holds, Google Reserve integration, two-way SMS — all wrong scope for this restaurant

### Architecture Approach

The architecture is a monorepo: the existing static site repo gains a `/functions` directory at root, which Cloudflare Pages automatically maps to API routes. One file (`functions/api/reservations.js`) exports `onRequestPost` and handles the entire reservation flow: validate input, insert into D1, call Twilio twice, return JSON. No router configuration is needed for a single endpoint. The D1 database is bound via `wrangler.jsonc` and the Cloudflare dashboard (both required for deployed Pages projects). Secrets are stored via `wrangler secret put` only — never in `wrangler.toml` or source code.

**Major components and responsibilities:**

1. **Cloudflare Pages (existing)** — Serve all static assets (`index.html`, `autres-prestations.html`, `Medias/*`) via CDN; routes `/*` except `/api/*`
2. **Pages Function `/functions/api/reservations.js`** — Single POST handler: validate, insert D1, send 2x SMS, return 201 or error JSON
3. **Cloudflare D1 (`reservations` table)** — Persist reservations with unique constraint on `(date, creneau, email)` to prevent duplicates; indexed on `date` for future queries
4. **Twilio SMS (2x `fetch()` per reservation)** — Guest confirmation + owner notification in French; sender must be Alphanumeric ID, not French mobile number
5. **GitHub `staging` branch** — Auto-deploys to preview URL `staging.<project>.pages.dev` against isolated staging D1 database
6. **`_routes.json`** — Prevents static assets from invoking the Function, keeping them on CDN free tier

**Key data flow:**
```
Form submit (browser) → POST /api/reservations → validate → D1 INSERT → Twilio SMS x2 → 201 response → success UI
```
SMS failures must NOT block the 201 response — the reservation is saved regardless; log Twilio errors but return success.

**Build order (dependency-constrained):**
1. D1 database provisioned and migration applied
2. `wrangler.jsonc` with D1 binding + Twilio secrets set
3. Pages Function handler written and tested
4. Staging branch configured with separate staging D1 database
5. HTML form updated to replace GHL iframe and call `/api/reservations`

### Critical Pitfalls

1. **French A2P SMS restriction (Twilio sender type)** — French carriers silently filter A2P SMS from French mobile numbers. Verify the existing Twilio account sender type FIRST. If the sender is a French mobile number (`+336xx`/`+337xx`), register an Alphanumeric Sender ID (e.g., "CANNASUCRE") before writing any SMS code. Registration requires Twilio approval — allow lead time.

2. **SMS character encoding cost (UCS-2 vs GSM-7)** — One accented French character (e.g., `é`) in a message body triggers UCS-2 encoding, cutting the per-segment limit from 160 to 70 characters. A single 160-character French message becomes 3 segments, tripling cost with no warning. Test every SMS template with the Twilio Segment Calculator before deploying. Enable Smart Encoding in Twilio Messaging Services.

3. **GHL phone number lost during migration** — Go High Level deletes phone numbers 14 days after subscription cancellation. Audit whether the current Twilio sender number is owned by the direct Twilio account or by GHL before canceling. Run both systems in parallel for at least 1 week before cutting over. Cancel GHL only after confirming the new system works in production.

4. **Staging using production D1 database** — Pages Function bindings are environment-scoped; a single binding defined at `wrangler.toml` top level will apply to all environments. Create two D1 databases (`reservations_prod` and `reservations_staging`) and configure them separately in the Cloudflare dashboard. Test reservations must never appear in the production database.

5. **CORS blocking Pages → Worker (if standalone Worker is used)** — If the architecture deviates from the Pages Functions approach and uses a standalone Worker on a different subdomain, the browser will block the form POST. The mitigation is to use Pages Functions (same origin, no CORS needed). If a standalone Worker is used instead, an explicit OPTIONS handler with correct `Access-Control-Allow-*` headers is mandatory — and the origin must be allowlisted, not `*`.

---

## Implications for Roadmap

Based on the research, the build has a clear dependency ordering with infrastructure as the prerequisite for everything else. Three phases are recommended.

### Phase 1: Infrastructure and Backend

**Rationale:** Architecture research identifies a strict dependency order — D1 must exist before the Function can be written; secrets must be set before SMS works; staging must be isolated before any test can be trusted. All critical pitfalls are also Phase 1 pitfalls. Nothing else can proceed until this foundation is verified.

**Delivers:**
- D1 databases created (prod + staging) with migration applied
- `wrangler.jsonc` configured with D1 binding
- Twilio sender type verified; Alphanumeric Sender ID registered if needed
- Twilio secrets set via `wrangler secret put`
- `functions/api/reservations.js` POST handler with full validation, D1 write, Twilio SMS x2
- Staging branch configured with separate staging D1 binding
- `_routes.json` to protect static asset billing

**Addresses (from FEATURES.md):** Cloudflare Worker backend, D1 reservation storage, client SMS, owner SMS, server-side validation, Monday blocking, honeypot anti-spam, staging workflow

**Avoids (from PITFALLS.md):** Twilio sender type failure, SMS encoding cost, staging/prod D1 contamination, credentials in git, CORS issues, D1 race condition (unique constraint at schema creation)

**Research flag:** Standard patterns; no additional research needed. Official Cloudflare docs cover all components at HIGH confidence.

---

### Phase 2: HTML Form and Frontend Wiring

**Rationale:** FEATURES.md and ARCHITECTURE.md both identify the HTML form as the final wiring step — it is decoupled from the backend and can be built and tested against the live API independently. The backend (Phase 1) should be verified via `curl` before the form is built. This order allows each layer to be tested in isolation.

**Delivers:**
- GHL iframe removed from `index.html`
- Native HTML booking form with: name, phone, email, date picker (no Mondays, future dates only), time slot select (midi/soir), party size select (1-10), honeypot field
- Client-side validation with inline error messages (French)
- Submit button disabled on click + loading spinner
- Success message displayed on 201 response
- Error messages for validation errors vs. network errors (French, specific)
- Mobile-responsive form (consistent with existing site)

**Addresses (from FEATURES.md):** HTML booking form, client-side validation, Monday + past date blocking, success/error feedback, mobile-friendly form

**Avoids (from PITFALLS.md):** UX pitfalls (duplicate submit via double-click, Monday selectable in picker, non-specific error messages)

**Research flag:** Standard patterns; well-documented HTML form techniques, no additional research needed.

---

### Phase 3: Production Cutover and GHL Decommission

**Rationale:** PITFALLS.md identifies the GHL migration as a Phase 2/cutover risk requiring explicit planning. This phase is operational, not technical, but it is the highest-recovery-cost failure point in the project. It must be a planned, deliberate step with a verification checklist — not an afterthought.

**Delivers:**
- End-to-end verification on staging: form submission → D1 write → both SMS received on real phones
- Production deployment (merge staging → main)
- "Looks Done But Isn't" checklist fully passed (CORS, staging/prod isolation, closed days, sender type, secrets, SMS encoding, GHL number audit)
- Parallel run period (both GHL and new system active for at least 1 week)
- GHL subscription canceled only after parallel run confirms new system works
- `index.html` GHL iframe embed removed from production

**Addresses (from FEATURES.md):** Complete replacement of GHL + n8n dependency chain

**Avoids (from PITFALLS.md):** GHL phone number loss on cancellation, silent SMS delivery failures discovered post-cutover

**Research flag:** No research needed; this is an operational execution phase. The pitfall documentation is the checklist.

---

### Phase Ordering Rationale

- Infrastructure precedes form because the backend can be tested with `curl` before the form exists, but the form cannot work without the backend
- Staging isolation is a Phase 1 requirement, not optional — testing any feature without an isolated staging environment risks production data contamination
- GHL decommission is its own phase because it requires a deliberate parallel-run period; it is the only irreversible step in the project (canceling GHL is permanent)
- Features that require a Cron Trigger (automated reminders) are excluded from all three phases — they are v1.x additions that depend on production stability first

### Research Flags

Phases with standard patterns (skip additional research):
- **Phase 1:** Cloudflare Workers + D1 + Twilio are all covered at HIGH confidence by official documentation. No ambiguous integrations.
- **Phase 2:** HTML form patterns are universal; the existing site's CSS and layout are already established.
- **Phase 3:** Operational checklist, no new technology.

Phases that may need targeted investigation during implementation:
- **Phase 1 (Twilio sender registration):** If the current Twilio account sender is a French mobile number, the Alphanumeric Sender ID registration process with French carriers may have non-obvious steps or lead times. Investigate Twilio's registration portal early — this is a blocker for SMS testing.
- **Phase 1 (`@hono/zod-validator` Zod 4 compatibility):** STACK.md flags that `@hono/zod-validator` may not yet support Zod 4. Verify on install; pin `zod@3` if needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry and official Cloudflare docs on 2026-02-26. Wrangler 4, Hono 4.12.2, Zod 4.3.6 all confirmed current stable. |
| Features | HIGH | Replacement system with known, bounded scope. Owner-defined requirements from PROJECT.md. Existing codebase analyzed directly (GHL iframe observed at index.html line 2681). Feature landscape MEDIUM from industry sources, but scope confidence HIGH. |
| Architecture | HIGH | Official Cloudflare Pages Functions docs cover all components. Pages Functions file-based routing, D1 binding, Twilio fetch() pattern all verified. |
| Pitfalls | HIGH | All critical pitfalls sourced from official Cloudflare and Twilio documentation. French A2P restriction verified from Twilio's France SMS guidelines. |

**Overall confidence:** HIGH

### Gaps to Address

- **`@hono/zod-validator` + Zod 4 compatibility:** Not definitively confirmed in research. Resolve on first install by checking the package's `peerDependencies`. Fall back to Zod 3 if needed — zero feature impact.
- **Current Twilio sender number type:** Not confirmed whether the existing Twilio account uses a mobile number, US long code, or already has an Alphanumeric Sender ID configured. This must be audited as the first action in Phase 1. If registration is required, it is a blocker for all SMS testing.
- **GHL number ownership:** PROJECT.md states "Twilio est deja en place et fonctionnel" but does not confirm whether the Twilio sending number is registered under the direct Twilio account or under GHL's managed sub-account. Audit via Twilio dashboard > Phone Numbers before any GHL cancellation discussion.
- **`wrangler.jsonc` vs `wrangler.toml` for Pages Functions:** Architecture research uses `wrangler.jsonc` while STACK.md uses `wrangler.toml`. Both formats are valid; JSONC is the current recommended format for new projects. Resolve by using `wrangler.jsonc` as the single source of truth.

---

## Sources

### Primary (HIGH confidence)
- [Cloudflare Pages Functions — Get Started](https://developers.cloudflare.com/pages/functions/get-started/) — architecture, file-based routing
- [Cloudflare Pages Functions — Bindings (D1)](https://developers.cloudflare.com/pages/functions/bindings/) — D1 binding pattern
- [Cloudflare D1 — Overview + Limits](https://developers.cloudflare.com/d1/) — pricing, free tier, GA status
- [Cloudflare Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) — secrets, module state, error handling
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) — `wrangler secret put` pattern
- [Wrangler v4 Changelog](https://developers.cloudflare.com/changelog/post/2025-03-13-wrangler-v4/) — current stable confirmed
- [Hono Cloudflare Workers Guide](https://hono.dev/docs/getting-started/cloudflare-workers) — setup, routing, bindings
- [Twilio Messages REST API](https://www.twilio.com/docs/sms/api) — endpoint, auth, fetch() pattern
- [Twilio France SMS Guidelines](https://www.twilio.com/en-us/guidelines/fr/sms) — A2P restrictions, Alphanumeric Sender ID
- [Twilio SMS Character Limits](https://www.twilio.com/docs/glossary/what-sms-character-limit) — UCS-2 encoding, segment calculation
- [D1 Worker API — batch()](https://developers.cloudflare.com/d1/worker-api/d1-database/) — atomic writes, transaction pattern
- npm registry: hono@4.12.2, wrangler@4.68.1, @cloudflare/workers-types@4.20260305.0, zod@4.3.6 — all verified 2026-02-26

### Secondary (MEDIUM confidence)
- [Making static sites dynamic with Cloudflare D1](https://blog.cloudflare.com/making-static-sites-dynamic-with-cloudflare-d1/) — patterns for static site + D1
- [The 13 Best Online Restaurant Reservation Systems (2026) — EatApp](https://restaurant.eatapp.co/blog/online-restaurant-reservation-systems) — feature landscape
- [Top 10 Features Restaurant Owners Want (2025) — UpSalt](https://www.upsalt.io/en/restaurants/top-features-restaurant-reservation-system-2025/) — feature priorities
- [Why SMS Confirmations Stop No-Shows — Tableo](https://tableo.com/technology-innovation/restaurant-sms-confirmations/) — SMS confirmation value
- [Resy + Twilio case study](https://customers.twilio.com/en-us/resy) — SMS pattern for restaurant bookings
- [Persistent CORS Preflight Error — Cloudflare Community](https://community.cloudflare.com/t/persistent-cors-preflight-error-between-pages-and-worker-headers-missing-despite-w/792940) — CORS failure mode
- [GoHighLevel cancellation data policy](https://help.gohighlevel.com/support/solutions/articles/155000004281-what-happen-s-to-your-data-when-you-cancel-your-highlevel-subscription-) — 14-day number deletion window

### Project sources (HIGH confidence)
- `.planning/PROJECT.md` — owner-defined scope and requirements
- `index.html` line 2681 — direct observation of GHL iframe embed in current codebase

---
*Research completed: 2026-02-26*
*Ready for roadmap: yes*
