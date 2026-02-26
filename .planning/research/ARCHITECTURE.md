# Architecture Research

**Domain:** Static restaurant website + serverless reservation backend
**Researched:** 2026-02-26
**Confidence:** HIGH (verified against official Cloudflare Pages, Workers, D1 documentation)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (CLIENT)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  index.html (static)                                     │   │
│  │  - Restaurant content (hero, menu, galerie, etc.)        │   │
│  │  - Reservation form (vanilla JS, replaces Optyms iframe) │   │
│  │  - Sends POST to /api/reservations via fetch()           │   │
│  └──────────────────────────────┬───────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────┘
                                  │ HTTPS
┌─────────────────────────────────▼───────────────────────────────┐
│                    CLOUDFLARE EDGE NETWORK                       │
│                                                                  │
│  ┌──────────────────────┐   ┌──────────────────────────────┐    │
│  │  Cloudflare Pages    │   │  Pages Functions (/functions) │    │
│  │  (Static Assets)     │   │  /functions/api/             │    │
│  │                      │   │    reservations.js           │    │
│  │  - index.html        │   │      POST → validate         │    │
│  │  - autres-prest.html │   │           → insert D1        │    │
│  │  - Medias/*          │   │           → Twilio SMS x2    │    │
│  │                      │   │           → JSON response    │    │
│  │  Routes: /*          │   │  Route: /api/reservations    │    │
│  └──────────────────────┘   └──────────────┬───────────────┘    │
│                                            │                     │
│              ┌─────────────────────────────┤                     │
│              ▼                             ▼                     │
│  ┌───────────────────────┐   ┌────────────────────────────┐     │
│  │  Cloudflare D1        │   │  Secrets (env vars)        │     │
│  │  (SQLite database)    │   │  TWILIO_ACCOUNT_SID        │     │
│  │                       │   │  TWILIO_AUTH_TOKEN         │     │
│  │  Table: reservations  │   │  TWILIO_FROM_NUMBER        │     │
│  │  - id, nom, prenom    │   │  OWNER_PHONE_NUMBER        │     │
│  │  - telephone, email   │   └────────────────────────────┘     │
│  │  - date, creneau      │                                      │
│  │  - nb_couverts        │                                      │
│  │  - created_at         │                                      │
│  └───────────────────────┘                                      │
└──────────────────────────────────────────────────────────────────┘
                    │ fetch() POST (x2 SMS)
┌───────────────────▼──────────────────────────────────────────────┐
│                    TWILIO API                                     │
│  POST https://api.twilio.com/2010-04-01/Accounts/{SID}/          │
│                              Messages.json                        │
│                                                                   │
│  SMS #1 → Client phone (confirmation)                            │
│  SMS #2 → Owner phone (full reservation details)                 │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Cloudflare Pages (static) | Serve HTML, CSS, JS, images via CDN | `index.html`, `autres-prestations.html`, `Medias/*` at repo root |
| Pages Function `/api/reservations` | Validate input, write to D1, trigger SMS | `/functions/api/reservations.js` — `onRequestPost` handler |
| Cloudflare D1 | Persist reservation records as SQLite | Single table `reservations`, bound as `DB` env binding |
| Twilio API | Send SMS to client and owner | Two `fetch()` POST calls to Twilio Messages endpoint, authenticated with Basic Auth |
| GitHub `staging` branch | Preview environment for testing before production | Cloudflare Pages auto-generates `staging.<project>.pages.dev` alias |
| `_routes.json` | Keep static assets off Function billing | Exclude `/Medias/*`, `/*.html` from Function invocation |

## Recommended Project Structure

```
restaurantlacanneasucre.com/       ← repo root = Cloudflare Pages root
├── index.html                     # Main static site (~3400 lines, to be cleaned up)
├── autres-prestations.html        # Services page
├── Medias/                        # Static media assets
│   ├── images/
│   └── videos/
│
├── functions/                     # Pages Functions directory (NEW)
│   └── api/
│       └── reservations.js        # POST handler: validate → D1 → Twilio
│
├── migrations/                    # D1 SQL migrations (NEW)
│   └── 001-create-reservations.sql
│
├── _routes.json                   # Route control: exclude static from Functions (NEW)
├── wrangler.jsonc                  # Cloudflare config: D1 binding, compatibility date (NEW)
│
└── .planning/                     # Project planning (existing)
    ├── PROJECT.md
    ├── codebase/
    └── research/
```

### Structure Rationale

- **`functions/` at repo root:** Cloudflare Pages requires the `functions/` directory at project root, not inside `/dist` or any subdirectory. Since this is a plain static site (no build step), the repo root is the Pages output directory.
- **`functions/api/reservations.js`:** File path maps directly to route `/api/reservations`. A file named `reservations.js` in `functions/api/` creates the route `/api/reservations` automatically. No router configuration needed.
- **`migrations/`:** SQL files applied via `wrangler d1 execute --file=...`. Versioned sequentially, applied manually or via CI. Keeps schema changes auditable.
- **`_routes.json`:** Controls which paths invoke the Function vs. serve static assets. Static asset requests (images, HTML pages) should bypass the Function to remain on the free tier and be served by CDN.
- **`wrangler.jsonc`:** Required for local development (`wrangler pages dev`) and D1 binding definition. Also declares compatibility date for Worker runtime.

## Architectural Patterns

### Pattern 1: File-Based API Route (Pages Functions Standard Mode)

**What:** A file at `functions/api/reservations.js` automatically becomes the handler for `/api/reservations`. Export `onRequestPost` to handle only POST requests, letting other methods return 405.

**When to use:** Always — for a simple single-endpoint API like this reservation system. No framework or router needed.

**Trade-offs:** Simple, zero-config routing. Limitation: no TypeScript without a build step (use plain JS, or add a Wrangler build step).

**Example:**
```javascript
// functions/api/reservations.js
export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse JSON body
  const data = await request.json();

  // Validate required fields
  const required = ['nom', 'prenom', 'telephone', 'email', 'date', 'creneau', 'nb_couverts'];
  for (const field of required) {
    if (!data[field]) {
      return Response.json({ error: `Champ manquant: ${field}` }, { status: 400 });
    }
  }

  // Insert into D1
  await env.DB.prepare(`
    INSERT INTO reservations (nom, prenom, telephone, email, date, creneau, nb_couverts)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.nom, data.prenom, data.telephone, data.email,
    data.date, data.creneau, data.nb_couverts
  ).run();

  // Send SMS via Twilio
  await sendSMS(env, data.telephone, buildClientSMS(data));
  await sendSMS(env, env.OWNER_PHONE_NUMBER, buildOwnerSMS(data));

  return Response.json({ success: true }, { status: 201 });
}

// Return 405 for non-POST
export async function onRequest(context) {
  return new Response('Method Not Allowed', { status: 405 });
}
```

### Pattern 2: D1 Binding via `wrangler.jsonc`

**What:** D1 is accessed through a binding variable (`env.DB`) defined in `wrangler.jsonc`. The binding name is arbitrary but should be `DB` for clarity. Two separate bindings are needed: one for production, one for staging/preview.

**When to use:** Always — bindings are the only way to access D1 from a Pages Function.

**Trade-offs:** Must configure separately in Cloudflare dashboard for Pages projects (wrangler.jsonc alone is not sufficient for Pages; dashboard configuration is also required for deployed environments).

**Example:**
```jsonc
// wrangler.jsonc
{
  "compatibility_date": "2025-01-01",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "lacanneasucre-prod",
      "database_id": "YOUR-PROD-DB-ID"
    }
  ]
}
```

For local development:
```bash
npx wrangler pages dev . --d1 DB=YOUR-DATABASE-ID
```

### Pattern 3: Twilio SMS via fetch() with Basic Auth

**What:** Twilio's messaging API accepts standard HTTP POST with URL-encoded form body. No SDK needed — a plain `fetch()` call works in any Worker runtime.

**When to use:** Always — the Worker runtime supports `fetch()` natively. Avoid importing Twilio's Node.js SDK (it is not compatible with the Worker runtime).

**Trade-offs:** Lightweight (no dependency), but requires manual error handling. Secrets stored via `wrangler secret put` keep credentials out of source code.

**Example:**
```javascript
async function sendSMS(env, toNumber, body) {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const token = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: toNumber,
      From: env.TWILIO_FROM_NUMBER,
      Body: body,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }
}
```

### Pattern 4: Staging Branch Workflow

**What:** A `staging` branch in GitHub triggers an automatic preview deployment at `staging.<project>.pages.dev`. This URL is stable (unlike per-commit hash URLs) and suitable for manual testing before merging to `main`.

**When to use:** Before any production deployment — submit a reservation on staging to test the full flow (D1 write + both SMS) before merging to `main`.

**Trade-offs:** Staging uses the same D1 binding configuration as configured in dashboard — you need a separate D1 database for staging (or accept staging writes going to prod DB during testing). Separate staging DB is the correct approach.

**Configuration approach:**
- Dashboard: Settings > Bindings > Set environment-specific bindings (Production vs. Preview)
- Production binding: `lacanneasucre-prod` D1 database
- Preview binding: `lacanneasucre-staging` D1 database
- Twilio secrets: Same account, can use same credentials (staging SMS sends are real)

## Data Flow

### Reservation Submission Flow

```
User fills form in browser
    ↓
JavaScript validates client-side (basic presence check)
    ↓
fetch('POST /api/reservations', { body: JSON })
    ↓
Pages Function onRequestPost() invoked
    ↓
Server-side validation (required fields, date format, creneau values)
    ↓
         [validation fails] → Response.json({ error }, { status: 400 })
    ↓
D1 INSERT INTO reservations (...) VALUES (...)
    ↓
         [D1 error] → Response.json({ error }, { status: 500 })
    ↓
fetch() POST → Twilio API → SMS to client phone
    ↓
fetch() POST → Twilio API → SMS to owner phone
    ↓
         [Twilio error] → log error, still return success (reservation is saved)
    ↓
Response.json({ success: true }, { status: 201 })
    ↓
Browser shows confirmation message to user
```

### Deployment Flow

```
Developer pushes to `staging` branch
    ↓
GitHub → Cloudflare Pages auto-deploy
    ↓
Preview URL: staging.restaurantlacanneasucre.pages.dev
    ↓
Manual test: submit reservation → check D1 staging DB → verify SMS received
    ↓
         [tests pass] → merge staging → main
    ↓
GitHub → Cloudflare Pages auto-deploy → production
    ↓
Production: restaurantlacanneasucre.com
```

### D1 Schema

```sql
-- migrations/001-create-reservations.sql
CREATE TABLE IF NOT EXISTS reservations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nom         TEXT NOT NULL,
  prenom      TEXT NOT NULL,
  telephone   TEXT NOT NULL,
  email       TEXT NOT NULL,
  date        TEXT NOT NULL,       -- ISO 8601: YYYY-MM-DD
  creneau     TEXT NOT NULL,       -- 'midi' or 'soir'
  nb_couverts INTEGER NOT NULL,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- Index for listing reservations by date (owner dashboard queries)
CREATE INDEX idx_reservations_date ON reservations(date);
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-500 reservations/month | Current architecture — D1 free tier (5M row reads, 100K writes/day), Pages free tier (500 builds/month, unlimited requests). No changes needed. |
| 500-10K reservations/month | Monitor D1 write quota. Still within free tier. Consider adding input validation middleware if spam becomes an issue. |
| 10K+ reservations/month | Add rate limiting via Cloudflare WAF rules. D1 paid tier if hitting limits. No architectural change required. |

### Scaling Priorities

1. **First bottleneck — Twilio cost:** Each reservation sends 2 SMS. At scale, this is the main cost driver. Mitigation: use Twilio's cheapest numbers, monitor usage in Twilio console.
2. **Second bottleneck — D1 write limits:** Free tier allows 100K row writes/day. A restaurant doing 100 reservations/day is nowhere near this limit. Not a real concern.

## Anti-Patterns

### Anti-Pattern 1: Using a Standalone Cloudflare Worker Instead of Pages Functions

**What people do:** Create a separate Worker at `workers.dev` and call it from the Pages site via cross-origin fetch.

**Why it's wrong:** Introduces a cross-origin boundary requiring CORS configuration, separate deployment management, two separate Cloudflare projects to maintain, and additional cognitive overhead. Pages Functions run on the same origin as the static site — no CORS needed.

**Do this instead:** Use the `/functions` directory within the same Pages project. The function runs at the same origin as the HTML, CORS is a non-issue.

### Anti-Pattern 2: Importing the Twilio Node.js SDK

**What people do:** `npm install twilio` and use the SDK's `client.messages.create()`.

**Why it's wrong:** The Twilio Node.js SDK relies on Node.js built-ins (`http`, `https`, `buffer`, etc.) that are not available in the Cloudflare Worker runtime, even with `nodejs_compat` compatibility flag. The SDK import will fail at runtime.

**Do this instead:** Use `fetch()` directly with the Twilio REST API. It's 10 lines of code and zero dependencies. See Pattern 3 above.

### Anti-Pattern 3: Hardcoding Twilio Credentials in Source Code

**What people do:** Put `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` directly in `wrangler.jsonc` or `functions/api/reservations.js`.

**Why it's wrong:** Credentials are committed to Git, visible in GitHub, potentially exposed in logs or error messages.

**Do this instead:** Use `wrangler secret put TWILIO_ACCOUNT_SID` and `wrangler secret put TWILIO_AUTH_TOKEN`. Secrets are encrypted at rest, not visible in source, and accessible via `env.TWILIO_ACCOUNT_SID` in the Function.

### Anti-Pattern 4: Using `_worker.js` (Advanced Mode) for This Use Case

**What people do:** Create a `_worker.js` at the output root for full control, manually routing all requests.

**Why it's wrong:** For a single API endpoint, this forces you to manually handle static asset serving via `env.ASSETS.fetch()`, implement all routing from scratch, and manage the build step to compile TypeScript. The complexity is entirely unnecessary for one route.

**Do this instead:** Use the `/functions` directory with a single file. File-based routing handles everything automatically. Keep it simple.

### Anti-Pattern 5: Blocking on SMS Before Returning Response

**What people do:** Await both Twilio calls before returning the HTTP 201, causing ~1-3 second delays visible to the user.

**Why it's wrong:** Twilio API calls add 200-800ms each. Making the user wait 1-2 seconds for the "reservation confirmed" message degrades UX unnecessarily. The SMS delivery is not synchronous anyway — Twilio queues it.

**Do this instead:** Use `context.waitUntil()` (if available in Pages Functions) to fire-and-forget the SMS calls after returning the response, or accept the latency and ensure both calls complete before responding (simpler, acceptable for this traffic volume). For a restaurant doing <50 reservations/day, the synchronous approach is fine.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Twilio Messaging API | `fetch()` POST with Basic Auth to `api.twilio.com` | Credentials via `wrangler secret put`. Two calls per reservation (client + owner). Content-Type must be `application/x-www-form-urlencoded`. |
| Cloudflare D1 | Native binding via `env.DB` | Configured in wrangler.jsonc + dashboard. Uses prepared statements with `?` placeholders to prevent SQL injection. |
| GitHub | Auto-deploy trigger | Push to `main` → production. Push to `staging` → preview at `staging.<project>.pages.dev`. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Static HTML ↔ Pages Function | `fetch('POST /api/reservations', { headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) })` from browser | Same origin — no CORS needed. Function handles OPTIONS implicitly if not defined. |
| Pages Function ↔ D1 | `env.DB.prepare(sql).bind(...).run()` | Synchronous from function perspective. D1 is at Cloudflare edge — sub-millisecond latency. |
| Pages Function ↔ Twilio | `fetch()` outbound HTTPS POST | Twilio is external — 200-800ms round trip. Error handling must not fail the reservation if SMS fails. |

## Build Order Implications

The components have clear dependency ordering:

1. **D1 database first** — Create the database and run migrations before any function can write to it. No function code works without the DB binding.
2. **Wrangler config second** — `wrangler.jsonc` must declare the D1 binding before local development works.
3. **Pages Function third** — The `functions/api/reservations.js` handler depends on D1 binding and Twilio secrets both existing.
4. **Twilio secrets fourth** — Set via `wrangler secret put` after the function exists. Can be set before or after function code is written.
5. **Staging branch fifth** — Push `staging` branch, configure preview bindings in Cloudflare dashboard (separate staging D1 database).
6. **HTML form last** — Replace Optyms iframe with native form that calls `/api/reservations`. This is the final wiring step. Decoupled from backend.

The HTML form can be built and tested against the live API independently. The backend (D1 + Function + Twilio) can be tested with `curl` before the form exists.

## Sources

- [Cloudflare Pages Functions — Get Started](https://developers.cloudflare.com/pages/functions/get-started/) — HIGH confidence (official docs)
- [Cloudflare Pages Functions — Routing](https://developers.cloudflare.com/pages/functions/routing/) — HIGH confidence (official docs)
- [Cloudflare Pages Functions — Bindings (D1)](https://developers.cloudflare.com/pages/functions/bindings/) — HIGH confidence (official docs)
- [Cloudflare Pages Functions — Advanced Mode](https://developers.cloudflare.com/pages/functions/advanced-mode/) — HIGH confidence (official docs)
- [Cloudflare Pages — Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/) — HIGH confidence (official docs)
- [Cloudflare Pages — Branch Build Controls](https://developers.cloudflare.com/pages/configuration/branch-build-controls/) — HIGH confidence (official docs)
- [Cloudflare D1 — Overview](https://developers.cloudflare.com/d1/) — HIGH confidence (official docs)
- [Cloudflare Workers — GitHub SMS Notifications via Twilio](https://developers.cloudflare.com/workers/tutorials/github-sms-notifications-using-twilio/) — HIGH confidence (official Cloudflare tutorial)
- [Making static sites dynamic with Cloudflare D1](https://blog.cloudflare.com/making-static-sites-dynamic-with-cloudflare-d1/) — MEDIUM confidence (official Cloudflare blog)

---
*Architecture research for: Cloudflare Pages + Workers + D1 reservation system on static restaurant site*
*Researched: 2026-02-26*
