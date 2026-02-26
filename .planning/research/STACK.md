# Stack Research

**Domain:** Serverless restaurant reservation system — Cloudflare Workers + D1 + Twilio SMS
**Researched:** 2026-02-26
**Confidence:** HIGH (all core versions verified against npm registry and official Cloudflare docs)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Cloudflare Workers | Runtime via Wrangler 4.68.1 | Serverless API backend for reservation endpoints | Already on Cloudflare; zero new infra cost; 100,000 free requests/day; runs at edge with <1ms cold start; D1 binding requires Workers |
| Cloudflare D1 | GA (managed SQLite) | Persistent reservation storage | Same-ecosystem as Workers (no cross-service latency); 5M rows read/day free; 500 MB storage free; GA since 2023; built-in migrations via Wrangler |
| Cloudflare Pages | Existing deployment | Static site hosting (no change) | Already in use; GitHub → Pages auto-deploy stays intact; free tier |
| Hono | 4.12.2 | HTTP routing framework for the Worker | Official Cloudflare docs recommend it; lightest opinionated router for Workers (no Node.js baggage); typed `c.env` bindings eliminate type errors; ~12kB; actively maintained (v4.12.x as of Feb 2026) |
| TypeScript | 5.x (via Wrangler) | Static typing across Worker code | Wrangler bundles TypeScript natively; `@cloudflare/workers-types` provides D1/Worker binding types; catches env binding mismatches at compile time |
| Twilio SMS (REST API) | v1 (2010-04-01 API) | Send SMS confirmation to customer + notification to owner | Existing Twilio account already active; called via a plain `fetch()` POST — no SDK needed; eliminates n8n dependency |
| Zod | 4.3.6 | Runtime validation of form submission payloads | Officially recommended by Cloudflare for Workers input validation; integrates with Hono via `zValidator` middleware; prevents bad data reaching D1; zero dependencies |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/workers-types | 4.20260305.0 | TypeScript types for Workers APIs, D1 binding, env vars | Always — install as dev dep; use with `wrangler types` to auto-generate Env interface |
| hono/zod-validator | (bundled with Hono 4.x) | Middleware to validate request bodies with Zod before handler runs | On every POST/PUT route that accepts external data (reservation form) |
| @cloudflare/vitest-pool-workers | Latest | Unit + integration tests that run in Miniflare (real Workers runtime) | When adding tests; spins up D1 in-memory for isolated per-test storage |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Wrangler 4.68.1 | CLI for local dev, D1 migrations, deployment, secrets | Install as local dev dep (`npm i -D wrangler@latest`). Never install globally — use `npx wrangler`. Wrangler 4 is current stable; v3 receives only security fixes until Q1 2027 |
| `wrangler dev` | Local development with live D1 | Runs Worker in Miniflare against a local SQLite file; data persists across runs by default; use `--local` flag explicitly (Wrangler 4 default) |
| `wrangler secret put` | Store Twilio credentials securely | Run once per environment: `wrangler secret put TWILIO_ACCOUNT_SID` and `wrangler secret put TWILIO_AUTH_TOKEN`. Never put these in `wrangler.toml` |
| `.dev.vars` | Local secret overrides | Same keys as production secrets; gitignored; loaded automatically by `wrangler dev` |
| `wrangler d1 migrations create/apply` | Schema version control | Creates numbered SQL migration files (`0001_initial_schema.sql`); tracks applied migrations in `d1_migrations` table; `--remote` flag required to run against production |
| `wrangler types` | Auto-generate TypeScript Env interface | Run after changing `wrangler.toml` bindings; eliminates manual `Env` interface upkeep |

---

## Installation

```bash
# Create the Worker project
npm create hono@latest reservations-worker
# Select: cloudflare-workers template

# Core runtime libraries
npm install hono zod

# Dev dependencies
npm install -D wrangler@latest @cloudflare/workers-types @cloudflare/vitest-pool-workers vitest
```

---

## wrangler.toml Reference

```toml
name = "lacanneasucre-reservations"
main = "src/index.ts"
compatibility_date = "2026-02-26"
compatibility_flags = ["nodejs_compat"]

[vars]
# Non-secret config — safe to commit
RESTAURANT_PHONE = "+33XXXXXXXXX"
TWILIO_PHONE_NUMBER = "+1XXXXXXXXXX"

# Secrets — set via: wrangler secret put TWILIO_ACCOUNT_SID
# TWILIO_ACCOUNT_SID = set via wrangler secret
# TWILIO_AUTH_TOKEN  = set via wrangler secret

[[d1_databases]]
binding = "DB"
database_name = "lacanneasucre-reservations"
database_id = "<UUID-from-wrangler-d1-create>"
preview_database_id = "<UUID-for-staging>"
migrations_dir = "migrations"

[observability]
enabled = true
head_sampling_rate = 1
```

---

## Routing Strategy: CORS-Free via Workers Route

**Problem:** Static site on `restaurantlacanneasucre.com` (Cloudflare Pages) calling an API on a different origin triggers CORS browser restrictions.

**Solution: Route the Worker to a subpath of the same domain.**

Add a route in `wrangler.toml`:

```toml
[[routes]]
pattern = "restaurantlacanneasucre.com/api/*"
zone_name = "restaurantlacanneasucre.com"
```

- The HTML form POSTs to `/api/reservations` — same origin, no CORS preflight
- Pages continues serving all other paths (`/`, `/menu`, `/galerie`, etc.)
- No CORS headers needed in the Worker for browser requests
- This is the official Cloudflare recommendation for this exact pattern (Pages frontend + Worker API on same domain)

**Alternative considered: Pages Functions** (`functions/api/reservations.ts` inside the Pages repo). Rejected because it tightly couples the Worker code to the Pages deployment cycle — you cannot deploy the API independently. A separate Worker with a route gives independent deploy pipelines.

---

## Twilio Integration Pattern

No Twilio SDK needed. Use a plain `fetch()`:

```typescript
async function sendSMS(env: Env, to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      From: env.TWILIO_PHONE_NUMBER,
      To: to,
      Body: body,
    }),
  });
}
```

Call this twice per reservation: once for the customer confirmation, once for the owner notification. Both calls can be awaited in sequence (total ~200-400ms typical Twilio latency — acceptable for a form POST).

---

## D1 Schema Pattern

```sql
-- migrations/0001_initial_schema.sql
CREATE TABLE IF NOT EXISTS reservations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nom        TEXT NOT NULL,
  prenom     TEXT NOT NULL,
  telephone  TEXT NOT NULL,
  email      TEXT NOT NULL,
  date       TEXT NOT NULL,   -- ISO 8601: YYYY-MM-DD
  creneau    TEXT NOT NULL,   -- 'midi' | 'soir'
  convives   INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Query pattern from Worker:

```typescript
const result = await env.DB
  .prepare("INSERT INTO reservations (nom, prenom, telephone, email, date, creneau, convives) VALUES (?, ?, ?, ?, ?, ?, ?)")
  .bind(data.nom, data.prenom, data.telephone, data.email, data.date, data.creneau, data.convives)
  .run();
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Hono | Raw Worker fetch handler | If the API has only 1-2 routes — saves a dependency. For this project Hono's middleware (zValidator, CORS) pays for itself immediately |
| Hono | itty-router | itty-router is lighter but has weaker TypeScript support and less active maintenance. Hono is now the Cloudflare-recommended choice |
| Zod 4 | Zod 3 | Zod 3 (`zod@3`) is still installable and stable if any third-party lib (e.g., drizzle-orm) hasn't updated peer deps to accept Zod 4 — check before pinning |
| Zod | valibot | valibot is smaller (~1kB) but ecosystem integrations (hono/zod-validator) are Zod-specific. Stick with Zod unless bundle size is critical |
| D1 (SQLite) | KV (Cloudflare KV) | KV is key-value only — no relational queries. D1 is the right fit for structured reservation data with date/time filtering |
| Direct Twilio fetch() | twilio npm package | The Twilio Node.js SDK is large and uses Node.js APIs not available in Workers. The direct fetch() approach is the correct pattern for Workers; the SDK would require polyfills |
| Pages + Worker route | Pages Functions | Pages Functions are acceptable for rapid prototyping, but couple API deploys to frontend deploys. A standalone Worker with a route gives independent deploy control |
| Worker route on same domain | Separate subdomain (api.restaurantlacanneasucre.com) | Use a subdomain only if you want to version the API or need CORS control for external consumers. For this internal form, same-origin is simpler and correct |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `twilio` npm package in Workers | SDK requires Node.js APIs (`http`, `crypto`) not available in the Workers runtime | Plain `fetch()` with Basic auth to Twilio REST API |
| `express` or any Node.js HTTP framework | Workers runtime is not Node.js — no `req`/`res` objects, no `http` module | Hono (built on Web Standards, works natively in Workers) |
| `process.env` for secrets | Not available in Workers runtime by default | `c.env.MY_SECRET` via Hono context, or `env.MY_SECRET` in handler |
| Secrets in `wrangler.toml` or source code | Config is committed to git — credentials would be exposed | `wrangler secret put` for production; `.dev.vars` (gitignored) for local dev |
| `Math.random()` for IDs | Not cryptographically secure | `crypto.randomUUID()` (available natively in Workers) |
| ORM (Drizzle, Prisma) | Adds complexity for what is a 2-table schema. Prisma doesn't support Workers at all (Node.js only). Drizzle works but is overkill for 3-4 queries | Raw D1 prepared statements with typed generics |
| `wrangler.dev` subdomain for production | Not suitable for business-critical production; treated as personal/hobby | Custom domain or route on the restaurant's zone |
| Module-level mutable state | Workers reuse isolates across requests — global variables persist between requests, causing data leaks | Scope all request state inside the handler function |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| hono@4.12.2 | wrangler@4.x, @cloudflare/workers-types@4.x | Hono 4.x requires no special compatibility flags |
| zod@4.3.6 | hono@4.12.2 (via `@hono/zod-validator`) | Install `@hono/zod-validator` separately: `npm install @hono/zod-validator`. Verify it supports Zod 4 — if not, pin `zod@3` temporarily |
| @cloudflare/workers-types@4.20260305.0 | wrangler@4.68.1 | Date-versioned package; update when Wrangler is updated to keep types in sync |
| wrangler@4.68.1 | Node.js >= 18 | Wrangler 4 dropped Node.js 16 support; Node.js 18 LTS minimum |

---

## Stack Patterns by Variant

**If staging and production environments needed:**
- Create two D1 databases (`lacanneasucre-reservations-staging` and `lacanneasucre-reservations-prod`)
- Use `[env.staging]` and `[env.production]` sections in `wrangler.toml` with separate `database_id` values
- Deploy staging: `wrangler deploy --env staging`
- Cloudflare Pages preview branches automatically get their own Worker preview via `preview_database_id`

**If the restaurant wants a simple admin view of reservations later:**
- D1 has an HTTP API accessible from the Cloudflare dashboard — no additional tooling needed for basic viewing
- A simple password-protected route in the same Worker (`GET /api/admin/reservations`) can list upcoming bookings

**If SMS volume grows and Twilio latency becomes an issue:**
- Move Twilio calls to `ctx.waitUntil()` so the form response returns immediately
- Use Cloudflare Queues (now free tier: 10,000 ops/day) to decouple SMS sending from the reservation write

---

## Sources

- [Cloudflare Workers Overview](https://developers.cloudflare.com/workers/) — capabilities and runtime
- [Cloudflare D1 Overview](https://developers.cloudflare.com/d1/) — GA status, pricing, Worker binding API
- [D1 Worker Binding API](https://developers.cloudflare.com/d1/worker-api/) — HIGH confidence, official Cloudflare docs
- [D1 Platform Limits](https://developers.cloudflare.com/d1/platform/limits/) — FREE tier: 5M reads/day, 100K writes/day, 500 MB — HIGH confidence
- [D1 Migrations](https://developers.cloudflare.com/d1/reference/migrations/) — wrangler migration workflow — HIGH confidence
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/) — 100K requests/day free — HIGH confidence
- [Workers Best Practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) — module format, secrets, error handling — HIGH confidence
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) — wrangler.toml D1 binding example — HIGH confidence
- [Wrangler Install](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — install as local dep — HIGH confidence
- [Wrangler v4 Changelog](https://developers.cloudflare.com/changelog/post/2025-03-13-wrangler-v4/) — v4 is current stable — HIGH confidence
- [Hono Cloudflare Workers Guide](https://hono.dev/docs/getting-started/cloudflare-workers) — setup, routing, bindings — HIGH confidence
- [Hono on Cloudflare Workers (official CF docs)](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/) — MEDIUM confidence (incomplete D1 examples)
- [Twilio Messages REST API](https://www.twilio.com/docs/sms/api) — endpoint, auth, fetch() pattern — HIGH confidence
- [Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) — wrangler secret put pattern — HIGH confidence
- [Workers Routing](https://developers.cloudflare.com/workers/configuration/routing/) — same-domain routing pattern — HIGH confidence
- npm registry — hono@4.12.2, wrangler@4.68.1, @cloudflare/workers-types@4.20260305.0, zod@4.3.6 — HIGH confidence (verified via `npm show` 2026-02-26)
- [GitHub: colinhacks/zod releases](https://github.com/colinhacks/zod/releases) — Zod 4 GA confirmed — HIGH confidence
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) — Pages Functions alternative considered — HIGH confidence

---
*Stack research for: La Canne a Sucre — Serverless Reservation System*
*Researched: 2026-02-26*
