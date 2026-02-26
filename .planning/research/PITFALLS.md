# Pitfalls Research

**Domain:** Restaurant reservation system — Cloudflare Workers + D1 + Twilio SMS
**Researched:** 2026-02-26
**Confidence:** HIGH (official Cloudflare docs + official Twilio docs verified)

---

## Critical Pitfalls

### Pitfall 1: Twilio Cannot Send SMS from French Mobile Numbers to French Recipients

**What goes wrong:**
French mobile numbers are blocked by carriers for A2P (Application-to-Person) traffic. If the existing Twilio account sends from a French mobile number, SMS to restaurant customers will silently fail or be filtered at the carrier level — no error from Twilio, just non-delivery.

**Why it happens:**
French regulation prohibits A2P SMS originating from mobile numbers. Twilio supports this restriction at carrier level but does not necessarily warn you at send time — messages enter the queue and fail silently downstream.

**How to avoid:**
Verify the sender type on the existing Twilio account before writing any SMS code. For A2P traffic to France:
- Use an **Alphanumeric Sender ID** (e.g., "CANNASUCRE") — free, one-way only, no replies possible
- Or use a **Technical Platform Number** with prefix `+3393903` (Twilio Private Offering, launched Oct 2024)
- Do NOT use a French mobile number (+336xx, +337xx) as the sender

If the current Twilio account uses a mobile number as sender, register an Alphanumeric Sender ID immediately before building the SMS integration. Registration requires Twilio's due-diligence process with French carriers — allow lead time.

**Warning signs:**
- Twilio logs show messages as "queued" or "sent" but customers report receiving nothing
- The `To` number is a French mobile (+33 6xx or +33 7xx) and the `From` is also a French mobile
- Twilio error code 30007 (message filtered) appears in logs

**Phase to address:**
Phase 1 (Backend setup) — verify sender type and register Alpha Sender ID before any SMS code is written. Do not defer this.

---

### Pitfall 2: French Accented Characters Trigger UCS-2 Encoding — Doubling SMS Cost

**What goes wrong:**
French confirmation messages contain accented characters (é, è, à, ç, ù). If any character falls outside GSM-7 encoding, Twilio automatically switches the entire message to UCS-2. This cuts the per-segment limit from 160 to 70 characters, causing a 160-character message to split into 3 segments — tripling the cost without any warning.

**Why it happens:**
GSM-7 includes some French characters but not all. One non-GSM character in the entire message body triggers the fallback. Developers writing templates in French do not notice this because the message appears correct in the Twilio console — the split happens silently.

**How to avoid:**
1. Enable **Smart Encoding** in Twilio Messaging Services (replaces smart quotes, long dashes with GSM-7 equivalents)
2. Test every SMS template using the [Twilio Segment Calculator](https://twiliodeved.github.io/message-segment-calculator/) before deploying
3. Write SMS templates in plain ASCII French where possible — use "e" instead of "é" in automated messages, or verify that your specific accents are in the GSM-7 extended set
4. Keep messages under 160 characters to stay within a single segment

**Warning signs:**
- Twilio logs show `num_segments: 2` or `num_segments: 3` on short messages
- Monthly Twilio costs are higher than expected per reservation
- Messages contain accented characters or curly quotes from copy-paste

**Phase to address:**
Phase 1 (SMS integration) — test templates with the segment calculator before the Worker is deployed. Write a character count assertion in code if budget is sensitive.

---

### Pitfall 3: CORS Blocking Fetch Calls from Cloudflare Pages to Workers API

**What goes wrong:**
The static HTML page on Cloudflare Pages calls the reservation API on a Cloudflare Worker (different subdomain: `*.workers.dev` vs `*.pages.dev`). The browser blocks the request with a CORS preflight error even though both are on Cloudflare infrastructure. The Worker receives the OPTIONS request but the response headers are missing or misconfigured.

**Why it happens:**
Browsers enforce CORS on cross-origin requests. A `*.pages.dev` origin calling `*.workers.dev` is cross-origin. The Worker must explicitly handle the `OPTIONS` preflight request and return correct `Access-Control-Allow-*` headers. Forgetting the OPTIONS handler is the single most common integration mistake reported in the Cloudflare community.

**How to avoid:**
In the Worker entry point, handle OPTIONS before any routing:

```javascript
if (request.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://restaurantlacanneasucre.com',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

For staging preview URLs, the origin changes per-branch (e.g., `https://abc123.restaurantlacanneasucre.pages.dev`). Use dynamic origin validation in the Worker instead of a hardcoded string — check against an allowlist of known origins.

Do NOT rely on the `_headers` file in Cloudflare Pages to set CORS headers — it does not affect the Worker response, only static asset responses.

**Warning signs:**
- Browser console shows "No 'Access-Control-Allow-Origin' header is present"
- Network tab shows `OPTIONS` returning 403 or missing headers
- Form works with `curl` but not from the browser

**Phase to address:**
Phase 1 (Worker + API setup). Write and test the CORS handler before any business logic. Test from the actual Pages URL, not localhost.

---

### Pitfall 4: D1 Race Condition — Double Booking via TOCTOU on Availability Check

**What goes wrong:**
Two customers submit reservation forms simultaneously for the same time slot. The Worker checks availability with `SELECT`, finds the slot open, then inserts. Both requests pass the check before either insert commits. Result: double booking.

**Why it happens:**
D1 is backed by a single SQLite Durable Object and provides snapshot isolation — but without using `batch()`, a check-then-insert sequence across two separate `await` calls can interleave. Standard `BEGIN TRANSACTION` is explicitly dangerous in D1 because it can block the entire database if the Worker crashes mid-transaction.

**How to avoid:**
Use `db.batch([...])` for any atomic check-and-insert operations. The D1 `batch()` method guarantees sequential, non-concurrent execution and is the only safe way to do transactional writes without `BEGIN TRANSACTION`.

For this project, since there is no capacity limit per slot (the restaurant manages manually), the actual double-booking risk is low. However, do not write a `SELECT` + `INSERT` pattern separated by `await` — use a single `INSERT` with a unique constraint on `(date, creneau, email)` and handle the constraint violation gracefully instead.

**Warning signs:**
- Duplicate rows in D1 with identical customer data and timestamps within milliseconds
- No unique constraint on the reservations table

**Phase to address:**
Phase 1 (D1 schema design). Add a unique constraint at schema creation time. Test by rapidly submitting the form twice.

---

### Pitfall 5: Twilio API Credentials Exposed in Static Site or Committed to Git

**What goes wrong:**
The Twilio Account SID and Auth Token are hardcoded in the Worker source file or — worse — accidentally included in a `wrangler.toml` `vars` block and committed to the public GitHub repository. Bots scan GitHub for Twilio credentials within minutes of exposure.

**Why it happens:**
Developers confuse Cloudflare Workers `vars` (plaintext, visible in dashboard and source) with `secrets` (encrypted, invisible after creation). The Twilio Auth Token gives full account access including sending SMS to any number and reading account data.

**How to avoid:**
1. Store Twilio credentials exclusively with `wrangler secret put TWILIO_ACCOUNT_SID` and `wrangler secret put TWILIO_AUTH_TOKEN`
2. For local development, use a `.dev.vars` file that is in `.gitignore`
3. Never add credentials to `wrangler.toml` under `[vars]`
4. Verify `.gitignore` includes `.dev.vars` and `.env` before first commit

```bash
# Correct — secrets are encrypted and not visible in dashboard
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN

# Wrong — visible in dashboard and config files
# [vars]
# TWILIO_ACCOUNT_SID = "ACxxxxxxxx"
```

**Warning signs:**
- `wrangler.toml` contains values that look like credentials
- `.dev.vars` or `.env` file appears in `git status` output
- Twilio dashboard shows unexpected usage or API calls from unknown IPs

**Phase to address:**
Phase 1 (project setup). Add `.gitignore` entries before creating any credentials files. Check with `git status` and `git log` before every push.

---

### Pitfall 6: Go High Level Phone Number Lost During Migration Cutover

**What goes wrong:**
The existing Twilio-based SMS number or GHL virtual number is deleted 14 days after Go High Level subscription cancellation. If the custom solution is not fully deployed and tested before cancellation, there is a period with no reservation system and potentially a lost phone number.

**Why it happens:**
GHL cancels and permanently deletes phone numbers 14 days after subscription end. Porting a number out of GHL requires advance planning — you need the Letter of Authorization (LOA) and billing statements, and the process takes time. Many teams cancel the old service first, then discover the phone number is gone.

**How to avoid:**
1. Build and fully test the new system in staging before touching GHL
2. If using a GHL-assigned phone number, initiate the number port to Twilio direct **before** canceling GHL
3. If not porting the number (customers contact via the website form, not by calling a number), confirm which assets are actually in GHL vs in the direct Twilio account
4. Audit the existing Twilio account — the PROJECT.md states "Twilio est deja en place et fonctionnel" — verify the sending number is already in the direct Twilio account, not owned by GHL
5. Run both systems in parallel for at least one full week (old GHL + new custom) before canceling GHL
6. Keep GHL on pause (not cancel) during the parallel-run period

**Warning signs:**
- Uncertainty about whether the Twilio account is owned directly or via GHL
- No staging test has been run with the new system
- GHL cancellation is initiated before the new system is deployed to production

**Phase to address:**
Phase 2 (production deployment and cutover). Plan the cutover explicitly as a phase step: audit number ownership, parallel-run for 1 week, cancel GHL only after confirmation.

---

### Pitfall 7: Cloudflare Pages Preview Deployment Using Production D1 Database

**What goes wrong:**
The staging branch deploys a Worker that still points to the production D1 database because the D1 binding in `wrangler.toml` is not environment-scoped. Test reservations from the staging URL pollute the production database, or worse — real bookings are accidentally processed during staging tests.

**Why it happens:**
Cloudflare Workers bindings (including D1) are non-inheritable between environments and must be explicitly defined per `[env.*]` block. Many developers define bindings only at the top level and assume they apply to all environments.

**How to avoid:**
Create two separate D1 databases:
- `reservations_prod` — production database, bound only in the production environment
- `reservations_staging` — staging/test database, bound in the staging environment

In `wrangler.toml`:

```toml
# Production (default)
[[d1_databases]]
binding = "DB"
database_name = "reservations_prod"
database_id = "xxx-prod-id"

# Staging
[env.staging]
[[env.staging.d1_databases]]
binding = "DB"
database_name = "reservations_staging"
database_id = "xxx-staging-id"
```

For Cloudflare Pages specifically, use the Cloudflare dashboard to set preview-environment bindings separately from production bindings.

**Warning signs:**
- Only one D1 database exists in the Cloudflare dashboard
- `wrangler.toml` has no `[env.staging]` section
- Reservations submitted from the staging URL appear in the same table as real reservations

**Phase to address:**
Phase 1 (infrastructure setup). Create both databases before writing any application code. Never allow staging to share production data.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Single D1 database for both staging and prod | Simpler setup | Test data contaminates prod; impossible to safely test | Never |
| Hardcode CORS origin as `*` | Easier development | Any site can post to your API; security risk | Local development only, never deployed |
| Skip Alphanumeric Sender ID registration | Send SMS immediately | SMS silently fails for all French recipients | Never for production |
| Put Twilio credentials in `vars` instead of `secrets` | Faster config | Credentials visible in dashboard and git | Never |
| SELECT then INSERT for availability | Simple code | Race condition on concurrent submissions | Never — use batch or unique constraint |
| No unique constraint on reservations table | Simpler schema | Duplicate bookings accumulate silently | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Twilio SMS to France | Use French mobile number as sender (`+336xx`) | Use Alphanumeric Sender ID or Technical Platform Number |
| Twilio SMS body | Write message in full French with accents | Test every template with segment calculator; enable Smart Encoding |
| Cloudflare Workers → Twilio | Call Twilio REST API without awaiting | Always `await fetch(twilioUrl, {...})` or use `ctx.waitUntil()` for non-blocking |
| Cloudflare Pages → Worker | Assume same-origin because both are Cloudflare | Explicitly handle OPTIONS preflight with correct CORS headers |
| D1 binding | Define only at top level in `wrangler.toml` | Define per `[env.*]` block for each environment |
| D1 writes | Use `BEGIN TRANSACTION` / `COMMIT` | Use `db.batch([...])` for atomic multi-statement operations |
| Secrets | Add to `wrangler.toml` under `[vars]` | Use `wrangler secret put` and `.dev.vars` for local dev |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Awaiting Twilio SMS before responding to user | Form submission takes 2-4 seconds | Send SMS via `ctx.waitUntil()` after returning 200 to the client | Every request — Twilio API latency is 1-3 seconds |
| Full table scan on reservations | D1 reads increase with every reservation; billing grows | Add index on `(date, creneau)` for availability queries | After ~1,000 reservations without index |
| No request size validation | Oversized body attempts (injection attacks) | Validate `Content-Length` and parse JSON with size guard before processing | Any malicious request |
| Calling D1 for every availability check | Latency on every form load | Pre-generate available slots client-side based on business rules (tue-sun, fixed hours) | Immediate — unnecessary DB calls |

For this restaurant's scale (tens of reservations per day), none of these traps are immediately critical — but the Twilio latency one directly impacts user experience and should be addressed from day one.

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No input validation on reservation form | SQL injection, spam reservations, Twilio cost abuse | Validate and sanitize all fields server-side in the Worker before any DB write or SMS send |
| No rate limiting on the reservation endpoint | Automated form submissions exhaust Twilio budget | Add Cloudflare Rate Limiting rule on the Worker route (1 request/10 seconds per IP) |
| Expose Twilio Auth Token in source code | Full Twilio account compromise; attacker can send SMS to any number | Use `wrangler secret put`; never put in `wrangler.toml` vars |
| No CSRF protection | Malicious sites can submit reservation forms | Add a simple honeypot field or `Origin` header validation in the Worker |
| Trust client-submitted date/time slot | Client can submit arbitrary dates including closed days | Validate that submitted date/creneau is within business hours (tue-sun, 12h-14h30 or 19h-22h30) server-side |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No loading state after form submission | User clicks submit repeatedly, creating duplicate reservations | Show spinner immediately on submit, disable the submit button |
| No success confirmation on the page | User unsure if reservation was received | Display a clear success message after API returns 200; do not rely on SMS alone as confirmation |
| SMS confirmation in English or with English-style formatting | Feels impersonal for a French restaurant | Write SMS templates in French; test character encoding as noted above |
| Error message says "An error occurred" | User does not know if they should retry | Show specific, actionable errors ("Ce creneau n'est pas disponible" vs "Erreur reseau, veuillez reessayer") |
| Lundi (Monday) is selectable in the date picker | Customer books for a closed day; owner gets notified; customer shows up to a closed restaurant | Block Monday server-side AND client-side; validate in Worker that day-of-week !== Monday |

---

## "Looks Done But Isn't" Checklist

- [ ] **SMS integration:** Confirm Twilio sends correctly to a real French mobile number — not just that the API call returns 200. Check the actual phone.
- [ ] **CORS:** Test the form submission from the deployed Pages URL (not localhost). Browser DevTools must show no CORS errors.
- [ ] **Staging/prod isolation:** Verify that a test reservation from the staging URL does NOT appear in the production D1 database.
- [ ] **Closed days:** Submit a reservation for a Monday from the form and confirm the Worker rejects it with an error.
- [ ] **Sender type:** Confirm in Twilio dashboard that the From number/sender is not a French mobile number before going live.
- [ ] **Secrets:** Run `git log --all -p | grep -i twilio` to confirm no credentials were ever committed.
- [ ] **Go High Level:** Confirm which Twilio number (if any) is registered inside GHL vs. the direct Twilio account before canceling GHL.
- [ ] **SMS template:** Run both the customer confirmation and owner notification templates through the Twilio segment calculator to confirm 1 segment each.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Twilio number lost after GHL cancellation | HIGH | Contact Twilio support to recover number (not guaranteed); register new number; update any customer-facing materials with new number |
| Credentials committed to git | HIGH | Immediately rotate Twilio Auth Token in dashboard; force-push is insufficient — assume compromised; check Twilio usage logs for abuse |
| Production D1 polluted with staging data | MEDIUM | Identify and delete test rows manually via Wrangler D1 console; add `is_test` flag retroactively; create separate staging DB going forward |
| Double-bookings due to no unique constraint | MEDIUM | Export reservation data; add unique constraint; restore data; contact affected customers manually |
| SMS not delivering to France (wrong sender type) | MEDIUM | Register Alphanumeric Sender ID (1-3 days for approval); update Worker `From` parameter; no customer impact if done before launch |
| CORS blocking form in production | LOW | Add OPTIONS handler and redeploy — Worker deployment takes under 30 seconds |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Twilio sender type (French A2P restriction) | Phase 1 — Infrastructure setup | Send test SMS to a real French mobile before any other work |
| SMS character encoding cost | Phase 1 — SMS integration | Run every template through segment calculator; check Twilio logs for `num_segments` |
| CORS blocking Pages→Worker | Phase 1 — Worker API creation | Test POST from deployed Pages URL in browser; not just curl |
| D1 race condition / no unique constraint | Phase 1 — D1 schema design | Schema review; integration test with rapid double-submit |
| Twilio credentials in git | Phase 1 — Project setup (first commit) | `git log -p | grep TWILIO` before first push |
| Staging uses production DB | Phase 1 — Infrastructure setup | Check D1 dashboard: two separate databases must exist |
| GHL number lost during migration | Phase 2 — Cutover planning | Audit Twilio account ownership before canceling GHL; run parallel for 1 week |
| Closed days not validated server-side | Phase 1 — Worker validation logic | Submit Monday reservation; confirm 4xx response from Worker |

---

## Sources

- [D1 Limits — Cloudflare official docs](https://developers.cloudflare.com/d1/platform/limits/) — HIGH confidence
- [Workers Limits — Cloudflare official docs](https://developers.cloudflare.com/workers/platform/limits/) — HIGH confidence
- [Workers Best Practices — Cloudflare official docs](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/) — HIGH confidence (updated Feb 2026)
- [Cloudflare Workers Secrets — Cloudflare official docs](https://developers.cloudflare.com/workers/configuration/secrets/) — HIGH confidence
- [Cloudflare Workers Environments — Cloudflare official docs](https://developers.cloudflare.com/workers/wrangler/environments/) — HIGH confidence
- [D1 FAQs — Cloudflare official docs](https://developers.cloudflare.com/d1/reference/faq/) — HIGH confidence
- [CORS header proxy — Cloudflare Workers examples](https://developers.cloudflare.com/workers/examples/cors-header-proxy/) — HIGH confidence
- [France SMS Guidelines — Twilio official docs](https://www.twilio.com/en-us/guidelines/fr/sms) — HIGH confidence
- [Alphanumeric Sender ID — Twilio official docs](https://www.twilio.com/docs/messaging/services/alphanumeric-sender-ids-in-messaging-services) — HIGH confidence
- [Twilio Rate Limits and Message Queues — Twilio Support](https://help.twilio.com/articles/115002943027-Understanding-Twilio-Rate-Limits-and-Message-Queues) — HIGH confidence
- [SMS Character Limits — Twilio official docs](https://www.twilio.com/docs/glossary/what-sms-character-limit) — HIGH confidence
- [Sending International SMS Guide — Twilio official docs](https://www.twilio.com/docs/messaging/guides/sending-international-sms-guide) — HIGH confidence
- [Limitations on sending SMS from French mobile numbers — Twilio Support](https://support.twilio.com/hc/en-us/articles/223133827-Limitations-on-sending-SMS-from-French-mobile-numbers) — HIGH confidence
- [GoHighLevel — What happens to data on cancellation](https://help.gohighlevel.com/support/solutions/articles/155000004281-what-happen-s-to-your-data-when-you-cancel-your-highlevel-subscription-) — MEDIUM confidence
- [Persistent CORS Preflight Error — Cloudflare Community](https://community.cloudflare.com/t/persistent-cors-preflight-error-between-pages-and-worker-headers-missing-despite-w/792940) — MEDIUM confidence
- [D1 transactions and batch() — Cloudflare D1 docs](https://developers.cloudflare.com/d1/worker-api/d1-database/) — HIGH confidence
- [Preview URLs — Cloudflare Workers docs](https://developers.cloudflare.com/workers/configuration/previews/) — HIGH confidence

---

*Pitfalls research for: Restaurant reservation system — Cloudflare Workers + D1 + Twilio SMS (La Canne a Sucre)*
*Researched: 2026-02-26*
