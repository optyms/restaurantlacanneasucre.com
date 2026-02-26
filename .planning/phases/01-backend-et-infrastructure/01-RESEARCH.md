# Phase 1: Backend et Infrastructure - Research

**Researched:** 2026-02-26
**Domain:** Cloudflare Pages Functions + D1 SQLite + Twilio SMS (no SDK)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Contenu SMS client** : Numero du restaurant inclus dans le SMS client pour permettre l'annulation par telephone
- **Langue SMS** : En francais
- **Formats telephone acceptes** : Numeros francais metropolitains uniquement (06, 07, +33)
- **Jour bloque** : Lundi seulement (pas de jours feries ni fermetures exceptionnelles)
- **Dates** : Pas de limite future, minimum = aujourd'hui
- **Creneaux** : Midi (12h, 12h30, 13h, 13h30) et Soir (19h, 19h30, 20h, 20h30, 21h)
- **Gestion erreurs Twilio** : Reservation sauvegardee dans D1 meme si l'envoi SMS echoue — pas de resa perdue
- **Comportement API echec SMS** : Retourne succes avec warning si SMS echoue

### Claude's Discretion

- Ton des SMS (formel/decontracte) — adapte a un restaurant
- Encodage SMS : choix GSM-7 (sans accents) vs UCS-2 (avec accents) selon rapport lisibilite/cout
- Infos incluses dans le SMS proprietaire (toutes ou selection)
- Retry automatique Twilio en cas d'echec
- Gestion SMS partiel (un reussit, l'autre echoue)
- Logging des echecs SMS (console.error Workers vs colonne D1)
- Limite min/max du nombre de convives
- Format de la reponse API succes (ID seul vs details complets)
- Structure des erreurs de validation (par champ vs message global)
- Format de l'identifiant de reservation (nanoid, UUID, auto-increment)
- Langue des messages d'erreur API (francais vs anglais)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Branche staging creee sur GitHub avec preview URL Cloudflare Pages fonctionnel | Section Architecture Patterns: branche `staging` → preview URL automatique Cloudflare Pages |
| INFRA-02 | Base D1 de production creee et bindee au Worker | Section Standard Stack + Code Examples: `wrangler d1 create` + binding dans wrangler.jsonc env.production |
| INFRA-03 | Base D1 de staging creee et bindee a l'environnement preview | Section Architecture Patterns: deux bases separees, binding dans env.preview de wrangler.jsonc |
| INFRA-04 | Configuration Wrangler (wrangler.jsonc) avec bindings D1 et routes | Section Code Examples: structure wrangler.jsonc avec pages_build_output_dir, d1_databases, env |
| INFRA-05 | Secrets Twilio (Account SID, Auth Token, sender number, owner number) configures via wrangler secret | Section Standard Stack: `wrangler pages secret put` — commande documentee |
| BACK-01 | Pages Function expose un endpoint POST /api/reservations | Section Architecture Patterns: fichier `functions/api/reservations.ts` → route automatique |
| BACK-02 | Validation server-side (miroir client-side + rejet lundi + rejet honeypot) | Section Code Examples: pattern Zod schema validation |
| BACK-03 | Schema D1: table reservations (id, first_name, last_name, phone, email, date, time_slot, party_size, created_at) | Section Code Examples: CREATE TABLE SQL exact |
| BACK-04 | Insertion de la reservation dans D1 apres validation | Section Code Examples: pattern `db.prepare().bind().run()` |
| BACK-05 | Gestion des erreurs avec codes HTTP et messages exploitables | Section Architecture Patterns: try/catch, codes 201/400/500 |
| SMS-01 | SMS de confirmation envoye au client via Twilio | Section Code Examples: fetch() vers Twilio API + template SMS client |
| SMS-02 | SMS de notification envoye au proprietaire via Twilio | Section Code Examples: fetch() vers Twilio API + template SMS proprietaire |
| SMS-03 | Templates SMS en francais, <160 chars par segment, eviter accents pour rester en GSM-7 | Section Architecture Patterns: encodage GSM-7 vs UCS-2 |
</phase_requirements>

---

## Summary

This phase implements a pure backend: Cloudflare Pages Functions serving `POST /api/reservations`, D1 SQLite for storage, and Twilio SMS via raw `fetch()`. There is no frontend in this phase — the success criterion is a working `curl` call.

**Critical strategic finding: Cloudflare deprecated Pages in April 2025**, redirecting all new investment to Workers. However, Pages is not being shut down — existing projects continue to work, and Cloudflare plans to auto-migrate Pages projects to Workers when they can do it without breakage. For this project (existing Pages site on Cloudflare), **continuing with Pages Functions is the correct approach**. The project already uses Pages and the file-based routing in `functions/` is a clean fit for a single POST endpoint. Migrating to Workers now would add complexity for no benefit at this scale.

The Twilio sender situation for France is a blocker that must be resolved before SMS code can be tested. French mobile numbers (+336/+337) **cannot be used as A2P SMS senders** — carriers block them. An Alphanumeric Sender ID is required for France and is free to obtain, but sensitive brand names may require a Letter of Authorization. The existing Twilio account's sender type must be verified before writing SMS code.

**Primary recommendation:** Use Cloudflare Pages Functions with a single `functions/api/reservations.ts` file, raw `fetch()` for Twilio, Zod v3 for validation (avoid Zod v4 compatibility issues with `@hono/zod-validator`), and GSM-7-safe SMS templates (no accents that would trigger UCS-2).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Wrangler | 4.x (latest) | CLI for D1 provisioning, dev, deploy, secrets | Official Cloudflare tool — no alternative |
| Cloudflare Pages Functions | N/A (platform) | File-based serverless functions, auto-routes from `functions/` dir | Zero config, same-origin as static site, free tier |
| Cloudflare D1 | N/A (platform) | SQLite-compatible serverless DB | Built into Cloudflare, free tier, binding via env |
| Zod | 3.x | Request body validation | `@hono/zod-validator` has known Zod v4 issues — stay on v3 |
| nanoid | 3.x (JSR `@sitnik/nanoid`) | Reservation ID generation | Uses Web Crypto API, Worker-compatible, URL-safe |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| TypeScript | 5.x | Type safety for env bindings (D1Database, etc.) | Always — prevents binding name typos |
| `@cloudflare/workers-types` | latest | TypeScript types for D1Database, ExecutionContext, etc. | Always with TypeScript Pages Functions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `fetch()` for Twilio | Twilio Node.js SDK | SDK uses Node.js built-ins incompatible with Workers runtime — raw fetch is required |
| Zod v3 | Zod v4 | Zod v4 has known `@hono/zod-validator` incompatibility; Zod v3 is stable on Workers |
| Cloudflare Pages Functions | Cloudflare Workers (standalone) | Workers is the future platform but Pages is not deprecated for existing projects; Pages provides file-based routing and same-origin benefits |
| nanoid | `crypto.randomUUID()` | `crypto.randomUUID()` is built into Workers runtime (no install needed) — simpler option |

**Installation:**
```bash
npm install zod@3
npm install --save-dev wrangler typescript @cloudflare/workers-types
npm install nanoid
# OR just use crypto.randomUUID() — no install needed
```

---

## Architecture Patterns

### Recommended Project Structure

```
restaurantlacanneasucre.com/
├── functions/
│   └── api/
│       └── reservations.ts    # POST /api/reservations handler
├── migrations/
│   └── 0001_create_reservations.sql  # D1 schema migration
├── wrangler.jsonc             # Cloudflare config: Pages + D1 bindings + env
├── .dev.vars                  # Local secrets (gitignored)
├── tsconfig.json              # TypeScript config for functions
├── index.html                 # Existing static site (unchanged in Phase 1)
└── ...                        # Other existing static files
```

### Pattern 1: Pages Functions File-Based Routing

**What:** A file at `functions/api/reservations.ts` is automatically routed to `POST /api/reservations`. No router config needed.

**When to use:** Single endpoint, static site with a few API routes.

**Example:**
```typescript
// functions/api/reservations.ts
// Source: https://developers.cloudflare.com/pages/functions/routing/

interface Env {
  DB: D1Database;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;
  TWILIO_OWNER_NUMBER: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Only POST is handled — other methods return 405 automatically
  const { request, env } = context;
  // ... validation, D1 insert, Twilio SMS
};
```

Named export `onRequestPost` handles only POST requests. Other HTTP methods on this file return 405 by default.

### Pattern 2: D1 Insert with Prepared Statements

**What:** Use `db.prepare().bind().run()` for parameterized inserts. Never use string interpolation.

**When to use:** All D1 writes — prevents SQL injection.

**Example:**
```typescript
// Source: https://developers.cloudflare.com/d1/worker-api/
const result = await env.DB.prepare(
  `INSERT INTO reservations (id, first_name, last_name, phone, email, date, time_slot, party_size, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
).bind(
  id, firstName, lastName, phone, email, date, timeSlot, partySize,
  new Date().toISOString()
).run();
```

### Pattern 3: Twilio SMS via fetch() — No SDK

**What:** POST to Twilio REST API with Basic Auth (Account SID + Auth Token), form-encoded body.

**When to use:** Any Worker/edge runtime — the SDK requires Node.js and is incompatible.

**Example:**
```typescript
// Source: https://www.twilio.com/docs/messaging/api/message-resource
async function sendSms(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const credentials = btoa(`${accountSid}:${authToken}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
    });

    if (!response.ok) {
      const data = await response.json() as { message?: string };
      return { success: false, error: data.message ?? `HTTP ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
```

### Pattern 4: wrangler.jsonc with Separate D1 Environments

**What:** Top-level config for local dev; `env.production` and `env.preview` for deployed environments. D1 bindings are **non-inheritable** — each environment must fully declare its own.

**When to use:** Prod/staging isolation requirement (INFRA-02, INFRA-03, INFRA-05).

**Example:**
```jsonc
// wrangler.jsonc
// Source: https://developers.cloudflare.com/pages/functions/wrangler-configuration/
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "restaurantlacanneasucre",
  "pages_build_output_dir": ".",
  "compatibility_date": "2025-01-01",

  // Default: used for local dev (wrangler pages dev)
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "reservations_staging",
      "database_id": "<STAGING_DB_ID>"
    }
  ],

  "env": {
    "production": {
      // Production: deployed when pushing to main branch
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "reservations_prod",
          "database_id": "<PROD_DB_ID>"
        }
      ]
    },
    "preview": {
      // Preview: deployed when pushing to staging branch
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "reservations_staging",
          "database_id": "<STAGING_DB_ID>"
        }
      ]
    }
  }
}
```

**IMPORTANT:** Cloudflare Pages maps branches to environments differently than Workers:
- Branch `main` → production environment
- All other branches (including `staging`) → preview deployments (uses `env.preview` config)

### Pattern 5: Request Validation with Zod

**What:** Parse and validate JSON body before touching D1 or Twilio.

**Example:**
```typescript
import { z } from 'zod';

const VALID_TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',  // Midi
  '19:00', '19:30', '20:00', '20:30', '21:00'  // Soir
] as const;

const FRENCH_PHONE_RE = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/;

const reservationSchema = z.object({
  first_name:  z.string().min(1).max(100),
  last_name:   z.string().min(1).max(100),
  phone:       z.string().regex(FRENCH_PHONE_RE, 'Numero francais metropolitain requis (06, 07, +33)'),
  email:       z.string().email(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD requis'),
  time_slot:   z.enum(VALID_TIME_SLOTS),
  party_size:  z.number().int().min(1).max(20),
  honeypot:    z.string().max(0).optional(), // Must be empty
});
```

**Monday + past date validation** (after Zod passes):
```typescript
const reservationDate = new Date(data.date + 'T12:00:00');
const today = new Date();
today.setHours(0, 0, 0, 0);

if (reservationDate < today) {
  return new Response(JSON.stringify({ error: 'La date ne peut pas etre dans le passe' }), { status: 400 });
}
if (reservationDate.getDay() === 1) { // 1 = Monday
  return new Response(JSON.stringify({ error: 'Le restaurant est ferme le lundi' }), { status: 400 });
}
```

### Pattern 6: D1 Schema Migration

**What:** Use `wrangler d1 migrations` to track and apply schema changes.

**Example migration file** `migrations/0001_create_reservations.sql`:
```sql
CREATE TABLE IF NOT EXISTS reservations (
  id           TEXT PRIMARY KEY,         -- nanoid or crypto.randomUUID()
  first_name   TEXT NOT NULL,
  last_name    TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT NOT NULL,
  date         TEXT NOT NULL,            -- ISO date YYYY-MM-DD
  time_slot    TEXT NOT NULL,            -- e.g., '12:00', '19:30'
  party_size   INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Apply to staging: `npx wrangler d1 migrations apply reservations_staging --env preview`
Apply to prod: `npx wrangler d1 migrations apply reservations_prod --env production`

### Anti-Patterns to Avoid

- **String-interpolating SQL:** `"INSERT INTO ... VALUES ('" + name + "')"` — SQL injection risk. Use `.prepare().bind()` always.
- **Using Twilio Node.js SDK:** It imports Node.js built-ins (`http`, `https`) that are not available in the Workers runtime. Use raw `fetch()`.
- **Storing Twilio secrets in wrangler.jsonc `vars`:** Plain `vars` are visible in the dashboard. Use `wrangler pages secret put` instead.
- **Using Zod v4 with `@hono/zod-validator`:** Known incompatibility issues reported in 2025. Pin to Zod v3.
- **Sharing one D1 database for prod and staging:** The `database_id` must be different between `env.production` and `env.preview` in wrangler.jsonc.
- **Using French accented characters in SMS without checking encoding:** Characters like `ê, ë, î, ï, ô, û` trigger UCS-2, reducing the limit from 160 to 70 characters per segment.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SMS delivery | Custom SMS queue/retry logic | Let Twilio handle delivery — save reservation in D1 first, then attempt SMS | Twilio has its own retry and carrier routing; our job is to not lose the reservation |
| ID generation | Sequential integers or `Math.random()` | `crypto.randomUUID()` (Workers built-in, zero deps) | Predictable IDs allow enumeration attacks; Math.random() is not cryptographically secure |
| Input validation | Custom regex parsing of all fields | Zod schema with `.safeParse()` | Zod handles coercion, type-safe errors, extendable |
| Environment secrets | Hardcoded values in source code | `wrangler pages secret put` | Secrets are encrypted at rest, never appear in logs or dashboards |
| DB migrations | Manual `wrangler d1 execute` with raw SQL | `wrangler d1 migrations apply` | Tracks applied migrations, prevents re-runs, reproducible |

**Key insight:** The entire backend is ~100 lines of TypeScript. The complexity is in configuration (two D1 databases, two environments, four Twilio secrets) not in the code itself.

---

## Common Pitfalls

### Pitfall 1: D1 Bindings Are Non-Inheritable

**What goes wrong:** Developer defines `d1_databases` at the top level of `wrangler.jsonc` and expects it to be inherited by `env.production` and `env.preview`. Deployment validation fails.

**Why it happens:** Unlike `compatibility_date` (inheritable), all Wrangler bindings (`d1_databases`, `kv_namespaces`, `vars`, secrets) are non-inheritable and must be explicitly declared in each environment block.

**How to avoid:** Always declare `d1_databases` in both `env.production` and `env.preview` blocks. If any non-inheritable key is overridden in any environment, ALL non-inheritable keys must be specified in that environment.

**Warning signs:** Wrangler deploy error mentioning "non-inheritable keys" or binding not found at runtime.

### Pitfall 2: French Mobile Number as Twilio Sender (Blocker)

**What goes wrong:** Attempting to use a French mobile number (+336/+337) as the `From` number in Twilio for A2P messaging. SMS is blocked by all French carriers.

**Why it happens:** French regulation prohibits A2P traffic from mobile numbers. Carriers block it silently or with error.

**How to avoid:** Before writing any SMS code, verify the Twilio account sender type:
- If the sender is a French mobile number → must register an Alphanumeric Sender ID (free, no pre-registration required in France, but may need Letter of Authorization for brand name)
- If the sender is already an Alphanumeric Sender ID or a Technical Platform number (+3393903xxx) → can proceed
- Alternative: Use a Twilio long code (domestic French number, not mobile) which supports A2P

**Warning signs:** Twilio API returns success (HTTP 201) but SMS is never delivered. Check Twilio Console > Logs > Messaging for carrier filtering errors.

### Pitfall 3: UCS-2 SMS Encoding — Cost Explosion

**What goes wrong:** SMS template includes characters like `ê, ë, î, ï, ô, û, œ` (common in French). Twilio automatically switches the entire message to UCS-2, reducing the 160-char limit to 70. A "short" message becomes 2-3 segments, tripling cost.

**Why it happens:** GSM-7 includes `é, è, à, ù` but NOT `ê, ë, î, ï, ô, û, œ`. One non-GSM-7 character forces the entire message to UCS-2.

**How to avoid:** Write SMS templates using only GSM-7-safe characters. Replace accented characters:
- `ê` → `e`, `ë` → `e`, `î` → `i`, `ï` → `i`
- `ô` → `o`, `û` → `u`, `œ` → `oe`
- `é, è, à, ù` are GSM-7-safe and can be kept
- Verify each template with a character counter (Twilio console or online GSM-7 calculator)

**Warning signs:** Twilio console shows a 160-char message as 2 segments.

### Pitfall 4: Timezone and Date Validation Bug

**What goes wrong:** Comparing `new Date(dateString)` directly to `new Date()` produces wrong results depending on timezone. `2026-02-26` parsed as `Date` is interpreted as UTC midnight, which in France (UTC+1) appears as the previous day.

**Why it happens:** ISO date strings without time component are parsed as UTC midnight. Workers run in UTC.

**How to avoid:** Compare dates using string comparison or by explicitly setting the time component:
```typescript
// Safe: compare strings for "today or later"
const today = new Date().toISOString().slice(0, 10); // "2026-02-26"
if (data.date < today) { /* past date */ }

// For day-of-week: parse with noon UTC to avoid date shifting
const dayOfWeek = new Date(data.date + 'T12:00:00Z').getUTCDay();
if (dayOfWeek === 1) { /* Monday */ }
```

### Pitfall 5: wrangler pages secret vs wrangler secret

**What goes wrong:** Running `wrangler secret put TWILIO_ACCOUNT_SID` instead of `wrangler pages secret put TWILIO_ACCOUNT_SID --project-name <name>`. The former creates the secret on a Worker, not on the Pages project.

**Why it happens:** `wrangler secret` targets Workers; `wrangler pages secret` targets Pages projects. The error is silent — the secret is created but not accessible from the Pages Function.

**How to avoid:** Always use `wrangler pages secret put <KEY> --project-name <your-pages-project-name>` for Pages projects. Verify in the Cloudflare dashboard under Workers & Pages > your project > Settings > Variables and Secrets.

### Pitfall 6: Pages Branch → Environment Mapping

**What goes wrong:** Developer deploys `staging` branch expecting Wrangler's `[env.staging]` to activate. Pages does not work like Workers environments.

**Why it happens:** Cloudflare Pages maps branches to environments differently:
- `main` branch → **production** environment (uses `env.production` config)
- All other branches → **preview** deployments (uses `env.preview` config)

There is no `env.staging` for Pages. Use `env.preview` for the staging D1 database.

**How to avoid:** In `wrangler.jsonc`, use `env.production` for prod and `env.preview` for all preview branches (including `staging`).

---

## Code Examples

### Complete POST /api/reservations Handler

```typescript
// functions/api/reservations.ts
// Sources: https://developers.cloudflare.com/pages/functions/routing/
//          https://developers.cloudflare.com/d1/worker-api/
//          https://www.twilio.com/docs/messaging/api/message-resource

import { z } from 'zod';

interface Env {
  DB: D1Database;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_FROM_NUMBER: string;
  TWILIO_OWNER_NUMBER: string;
}

const VALID_TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30',
  '19:00', '19:30', '20:00', '20:30', '21:00'
] as const;

const FRENCH_PHONE_RE = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/;

const schema = z.object({
  first_name:  z.string().min(1).max(100),
  last_name:   z.string().min(1).max(100),
  phone:       z.string().regex(FRENCH_PHONE_RE),
  email:       z.string().email(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time_slot:   z.enum(VALID_TIME_SLOTS),
  party_size:  z.number().int().min(1).max(20),
  honeypot:    z.string().max(0).optional(),
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // 1. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Corps de requete JSON invalide' }, 400);
  }

  // 2. Validate
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: 'Donnees invalides', details: parsed.error.flatten() }, 400);
  }
  const data = parsed.data;

  // 3. Business rules: no past dates, no Mondays
  const today = new Date().toISOString().slice(0, 10);
  if (data.date < today) {
    return jsonResponse({ error: 'La date ne peut pas etre dans le passe' }, 400);
  }
  const dayOfWeek = new Date(data.date + 'T12:00:00Z').getUTCDay();
  if (dayOfWeek === 1) {
    return jsonResponse({ error: 'Le restaurant est ferme le lundi' }, 400);
  }

  // 4. Honeypot
  if (data.honeypot) {
    return jsonResponse({ error: 'Spam detecte' }, 400);
  }

  // 5. Insert into D1
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  try {
    await env.DB.prepare(
      `INSERT INTO reservations (id, first_name, last_name, phone, email, date, time_slot, party_size, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, data.first_name, data.last_name, data.phone, data.email,
           data.date, data.time_slot, data.party_size, createdAt).run();
  } catch (err) {
    console.error('D1 insert failed:', err);
    return jsonResponse({ error: 'Erreur serveur — veuillez reessayer' }, 500);
  }

  // 6. Send SMS (non-blocking: reservation already saved)
  const service = data.time_slot <= '14:00' ? 'midi' : 'soir';
  const smsResults = await Promise.allSettled([
    sendSms(env, data.phone,              buildClientSms(data, service)),
    sendSms(env, env.TWILIO_OWNER_NUMBER, buildOwnerSms(data, service, id)),
  ]);

  const smsWarnings = smsResults
    .map((r, i) => r.status === 'rejected' ? `SMS ${i === 0 ? 'client' : 'proprietaire'} echoue` : null)
    .filter(Boolean);

  return jsonResponse({
    id,
    message: 'Reservation enregistree avec succes',
    ...(smsWarnings.length > 0 && { warnings: smsWarnings }),
  }, 201);
};

// SMS helper (no SDK — raw fetch)
async function sendSms(env: Env, to: string, body: string): Promise<void> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(env.TWILIO_ACCOUNT_SID + ':' + env.TWILIO_AUTH_TOKEN)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER, Body: body }).toString(),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? `Twilio HTTP ${res.status}`);
  }
}

// SMS templates — GSM-7 safe (no ê, ë, î, ï, ô, û, œ)
function buildClientSms(data: z.infer<typeof schema>, service: string): string {
  // Uses é (GSM-7 safe), avoids ê/ë/î/ï/ô/û
  return `La Canne a Sucre - Reservation confirmee\n`
    + `${data.first_name} ${data.last_name}, ${data.party_size} pers.\n`
    + `Le ${data.date} a ${data.time_slot} (service ${service})\n`
    + `Pour annuler: 04 XX XX XX XX`;
}

function buildOwnerSms(data: z.infer<typeof schema>, service: string, id: string): string {
  return `Nouvelle reservation #${id.slice(0, 8)}\n`
    + `${data.first_name} ${data.last_name} - ${data.party_size} pers.\n`
    + `${data.date} ${data.time_slot} (${service})\n`
    + `Tel: ${data.phone} | ${data.email}`;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### D1 Schema Migration

```sql
-- migrations/0001_create_reservations.sql
CREATE TABLE IF NOT EXISTS reservations (
  id          TEXT    PRIMARY KEY,
  first_name  TEXT    NOT NULL,
  last_name   TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  time_slot   TEXT    NOT NULL,
  party_size  INTEGER NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

### CLI Commands for Phase Setup

```bash
# 1. Create D1 databases (run once, save the output database_id)
npx wrangler d1 create reservations_prod
npx wrangler d1 create reservations_staging

# 2. Apply schema to both
npx wrangler d1 migrations apply reservations_prod --env production
npx wrangler d1 migrations apply reservations_staging --env preview

# 3. Set Twilio secrets for production
npx wrangler pages secret put TWILIO_ACCOUNT_SID --project-name restaurantlacanneasucre
npx wrangler pages secret put TWILIO_AUTH_TOKEN  --project-name restaurantlacanneasucre
npx wrangler pages secret put TWILIO_FROM_NUMBER --project-name restaurantlacanneasucre
npx wrangler pages secret put TWILIO_OWNER_NUMBER --project-name restaurantlacanneasucre

# 4. Local dev secrets (.dev.vars — gitignored)
# TWILIO_ACCOUNT_SID=ACxxx
# TWILIO_AUTH_TOKEN=xxx
# TWILIO_FROM_NUMBER=+33xxxxxxxxx
# TWILIO_OWNER_NUMBER=+33xxxxxxxxx

# 5. Test with curl
curl -X POST https://restaurantlacanneasucre.com/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Jean","last_name":"Dupont","phone":"0612345678","email":"jean@example.com","date":"2026-03-10","time_slot":"19:30","party_size":2}'
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `wrangler.toml` | `wrangler.jsonc` recommended | Wrangler v3.91.0 | JSON supports comments, IDE schema validation via `$schema` |
| Pages Functions as the primary serverless path | Cloudflare Workers with static assets | April 2025 | Pages is in maintenance mode; Workers is future-forward. Existing Pages projects continue to work. |
| Twilio Node.js SDK | Raw `fetch()` to Twilio REST API | Always (for edge runtimes) | SDK never worked on Workers — this is not new |
| `wrangler d1 execute --file` | `wrangler d1 migrations apply` | 2024 | Migrations command tracks applied files, prevents double-apply |

**Deprecated/outdated:**
- `wrangler.toml`: Still works but `wrangler.jsonc` is recommended for new projects (supports `$schema` for IDE autocomplete)
- Cloudflare Pages as new project recommendation: Cloudflare now recommends Workers for new projects. Pages continues to work for existing projects.

---

## Open Questions

1. **Twilio Sender Type (BLOCKER)**
   - What we know: French mobile numbers (+336/+337) cannot send A2P SMS. Alphanumeric Sender ID is required. Free, but may need Letter of Authorization for brand names.
   - What's unclear: The current Twilio account's sender number type (is it a mobile number? an Alphanumeric ID? a Technical Platform number?). This determines whether SMS can be tested immediately or requires registration first.
   - Recommendation: Check the Twilio Console before writing any SMS code. If the sender is a mobile number, initiate Alphanumeric Sender ID registration at https://help.twilio.com/articles/36973882933787 before proceeding.

2. **Cloudflare Pages Project Name**
   - What we know: `wrangler pages secret put` requires `--project-name`. The current Pages project is named by whatever was set in the Cloudflare dashboard.
   - What's unclear: The exact Pages project name in the Cloudflare account.
   - Recommendation: Check in Cloudflare Dashboard > Workers & Pages before running secret commands.

3. **`_routes.json` Needed?**
   - What we know: When a `functions/` directory exists, all requests go through Functions by default, consuming the free tier limit for static asset requests.
   - What's unclear: Whether the free tier limit matters for this low-traffic restaurant site.
   - Recommendation: Add a `_routes.json` excluding static assets to avoid unnecessary Function invocations. Simple config:
     ```json
     { "version": 1, "include": ["/api/*"], "exclude": [] }
     ```

---

## Sources

### Primary (HIGH confidence)

- [Cloudflare Pages Functions Routing](https://developers.cloudflare.com/pages/functions/routing/) — file-based routing, `onRequestPost` export
- [Cloudflare Pages Functions Wrangler Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/) — `wrangler.jsonc` structure, `env.production`/`env.preview`
- [Cloudflare Pages Functions Bindings](https://developers.cloudflare.com/pages/functions/bindings/) — D1 bindings, secrets management
- [Cloudflare D1 Worker API](https://developers.cloudflare.com/d1/worker-api/) — `prepare().bind().run()` pattern
- [Cloudflare D1 Environments](https://developers.cloudflare.com/d1/configuration/environments/) — separate databases per env
- [Cloudflare D1 Get Started](https://developers.cloudflare.com/d1/get-started/) — `wrangler d1 create`
- [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/) — `.dev.vars`, secret management
- [Twilio Messages Resource API](https://www.twilio.com/docs/messaging/api/message-resource) — REST endpoint, Basic Auth, form-encoded body
- [Twilio France SMS Guidelines](https://www.twilio.com/en-us/guidelines/fr/sms) — Alphanumeric Sender ID required for A2P
- [Twilio Alphanumeric Sender ID France](https://help.twilio.com/articles/36973882933787-Documents-Required-and-Instructions-to-Register-Your-Alphanumeric-Sender-ID-in-France) — registration process
- [Twilio French Mobile Number Limitations](https://support.twilio.com/hc/en-us/articles/223133827) — A2P blocked from mobile numbers
- `wrangler pages secret put --help` (verified live via CLI, Wrangler 4.68.1)
- `wrangler d1 migrations --help` (verified live via CLI, Wrangler 4.68.1)

### Secondary (MEDIUM confidence)

- [Cloudflare Pages deprecated April 2025](https://blog.cloudflare.com/pages-and-workers-are-converging-into-one-experience/) — Pages in maintenance mode, Workers is the future; auto-migration planned
- [Migrate from Pages to Workers](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/) — confirms Pages Functions `functions/` folder still works for now
- GSM-7 character set — multiple concordant sources confirm that `ê, ë, î, ï, ô, û` trigger UCS-2; `é, è, à, ù` are GSM-7-safe

### Tertiary (LOW confidence)

- Zod v4 + `@hono/zod-validator` incompatibility — GitHub issues and community reports; no official Hono changelog entry found. Recommendation: stay on Zod v3 until resolution confirmed.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified via official docs and live CLI
- Architecture: HIGH — file-based routing, D1 API, Twilio fetch pattern all from official docs
- Pitfalls: HIGH for Twilio France sender and non-inheritable bindings (verified); MEDIUM for GSM-7 character set (multiple sources agree)
- Zod v4 warning: MEDIUM — community reports, not yet a definitive official statement

**Research date:** 2026-02-26
**Valid until:** 2026-04-26 (stable APIs; Twilio France registration requirements may change faster)
