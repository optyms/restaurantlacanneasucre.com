# Feature Research

**Domain:** Restaurant reservation system — small independent restaurant (La Canne a Sucre, Ales, France)
**Researched:** 2026-02-26
**Confidence:** MEDIUM (feature landscape well-understood; specific implementation details from multiple sources, confirmed against restaurant's existing system and stated requirements)

---

## Context Note

This is a **replacement system**, not a greenfield product. The current system (Go High Level iframe embed at line 2681 of index.html) already works for the owner. The goal is to eliminate third-party dependency, not to add new capabilities. This heavily constrains the feature set — we are replacing what exists, not building what competitors offer.

**What the current system does:**
- Embeds a Go High Level booking widget via iframe
- Collects: name, phone, email, date, time slot, party size
- Sends client confirmation (via Go High Level)
- Triggers owner notification via n8n → Twilio SMS

**What we need to replace it with:**
- Custom HTML form (inline, no iframe)
- Cloudflare Worker handling form submission + storage in D1
- Direct Twilio SMS to client and owner

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that guests assume exist. Missing these makes the booking feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Date picker | Guests need to select a date before choosing a time | LOW | HTML `<input type="date">` is sufficient; no calendar library needed |
| Time slot selection | Restaurant has fixed services (midi / soir), not arbitrary times | LOW | `<select>` with two options: "Midi (12h-14h30)" and "Soir (19h-22h30)" |
| Party size input | Table capacity is core to a reservation | LOW | `<select>` or `<input type="number">` with 1-10 range |
| Guest name | Restaurant needs to identify the reservation | LOW | First name + last name fields |
| Guest phone number | Primary contact channel (SMS confirmation) | LOW | Required; format validation for French mobile numbers |
| Guest email | Secondary contact, confirmation backup | LOW | Format validation; optional but strongly recommended |
| Client SMS confirmation | Guest expects immediate proof of booking | LOW | Twilio API call from Worker; sends within seconds of submission |
| Form validation (client-side) | Prevents broken submissions, guides users | LOW | Required fields, date in future, valid phone/email format |
| Server-side validation | Prevents bad data reaching D1 and Twilio | LOW | Mirror client-side checks in the Worker |
| Monday blocking | Restaurant is closed Mondays; must not be selectable | LOW | Disable Mondays in datepicker + server-side rejection |
| Future dates only | Can't book a table in the past | LOW | Min date = today on datepicker + server-side check |
| Mobile-friendly form | Majority of restaurant bookings happen on mobile | LOW | Responsive layout already established in existing site |
| Success feedback | Guest needs confirmation the form was received | LOW | Show inline success message after Worker returns 200 |
| Error feedback | Guest needs to know if something went wrong | LOW | Inline error state; distinguish network error vs validation error |

### Differentiators (Competitive Advantage)

For this specific project, "competitive advantage" means advantages over the current iframe-based system, not over OpenTable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Owner SMS notification with full details | Owner gets all reservation info instantly on phone — current system requires logging into Go High Level to see details | LOW | Single Twilio SMS to owner's number with name, date, time, party size, phone |
| No external widget / no iframe | Page loads faster, no CORS dependency, form matches site design, no Go High Level branding | LOW | Replace iframe embed with native HTML form |
| Reservations stored in D1 | Owner can review bookings without logging into Go High Level | MEDIUM | Cloudflare D1 table; query via Worker |
| Graceful blocking of invalid dates | Current GHL widget may allow invalid selections; custom form can block closed days (Monday) at UI level | LOW | `<input type="date">` with `min` and disabled days via JS |
| Custom SMS content in French | Control exact wording sent to guest; can match restaurant's tone (currently determined by GHL) | LOW | Hardcoded French template in Worker |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem obviously useful but are wrong for this specific project.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Capacity limits per time slot | Prevent overbooking | Owner explicitly said they manage this manually; adds complexity (requires checking D1 count before accepting), can create false rejections if data is out of sync with real walk-in situation | Keep it manual; owner reviews SMS notifications and calls guests if overbooked |
| Online cancellation / modification | Guests want to change bookings easily | Requires building a second authenticated flow (reservation lookup by token or phone), SMS with link, link-based form — doubles the backend surface area; restaurant is small, a phone call is sufficient | Put restaurant phone number in confirmation SMS so guest can call to cancel |
| Email confirmation | Redundant when SMS already sent | Adds complexity (email service, template, deliverability concerns); SMS has 98% open rate vs ~20% for email; overkill for MVP | SMS only for now; email can be added later if owner requests it |
| Automated reminders (24h / 2h before) | Reduce no-shows | Requires a cron job / scheduled Worker (added infrastructure), Twilio costs per SMS, and consent tracking; small restaurant with loyal local clientele likely doesn't need this | Defer; the SMS confirmation itself reduces no-shows; owner can manually call no-shows |
| Guest account / login | Repeat customers want to see past bookings | Full auth system required; no value identified for this restaurant | No accounts; stateless booking only |
| Admin dashboard (web UI) | Owner wants to see all bookings | Separate app (already planned as Base44 project); not part of this milestone | Existing Base44 app handles this |
| Credit card hold / deposit | Reduce no-shows | Requires Stripe integration, legal text (French consumer law), refund handling; not needed by restaurant owner | Skip; no-show risk is acceptable at this scale |
| CAPTCHA | Prevent bot submissions | reCAPTCHA requires Google script on page, adds latency, harms UX on mobile; Cloudflare already provides bot protection at edge level | Use honeypot field + Cloudflare's built-in bot mitigation instead |
| Real-time availability | Show which slots are full | Requires counting reservations per slot on every page load; owner manages capacity manually | Static slot list; no availability count shown |
| Google Reserve / TripAdvisor integration | Multi-channel booking discovery | Third-party API dependencies; monthly fees; completely wrong scope for replacing one third-party with a custom system | Irrelevant; this is a private reservation form, not a discovery platform |
| Waitlist management | Fill cancellations | Requires separate data model, notification logic, guest queuing; overkill for this scale | Out of scope |
| Two-way SMS (reply YES to confirm) | Reduce no-shows via confirmation response | Requires Twilio incoming number, webhook endpoint, parsing logic; adds significant complexity for marginal benefit at small scale | One-way SMS only; confirmation is implicit (guest shows up) |

---

## Feature Dependencies

```
[Guest SMS confirmation]
    └──requires──> [Cloudflare Worker backend]
                       └──requires──> [Form submission handler]
                                          └──requires──> [HTML reservation form]

[Owner SMS notification]
    └──requires──> [Cloudflare Worker backend]
                       └──requires──> [Twilio credentials in Worker env vars]

[Reservation storage in D1]
    └──requires──> [Cloudflare Worker backend]
                       └──requires──> [D1 database provisioned + schema created]

[Monday / past date blocking]
    └──requires──> [HTML reservation form]
    └──enhances──> [Server-side validation in Worker]

[Honeypot anti-spam]
    └──requires──> [HTML reservation form]
    └──enhances──> [Server-side validation in Worker]
```

### Dependency Notes

- **Worker requires form:** The form is the entry point; the Worker has no value without it.
- **SMS requires Worker:** Twilio calls must be server-side (API keys cannot be in browser code).
- **D1 requires Worker:** D1 is only accessible from Workers, not from the static frontend.
- **Monday blocking requires both layers:** Client-side JS blocks it in the datepicker; server-side rejects it if JS is bypassed — both layers are needed for correctness.
- **Honeypot works at form level:** A hidden field filled by bots but never by humans; Worker rejects submissions where honeypot field has a value.

---

## MVP Definition

### Launch With (v1)

The minimum needed to replace Go High Level fully.

- [ ] **HTML booking form** — name, phone, email, date (no Mondays, no past), time slot (2 options), party size (1-10). Replaces the GHL iframe embed.
- [ ] **Client-side validation** — all required fields, French phone format, email format, date constraints. Gives immediate feedback before submission.
- [ ] **Cloudflare Worker endpoint** — receives POST from form, validates server-side, writes to D1, calls Twilio twice. Core backend.
- [ ] **D1 schema and storage** — reservations table with all fields + timestamp. Enables future admin queries.
- [ ] **Client SMS (French)** — confirms booking with date, time, party size, restaurant name and address. Reassures guest.
- [ ] **Owner SMS (French)** — full reservation details (name, phone, date, time, party size). Replaces n8n workflow.
- [ ] **Monday blocking + past date blocking** — prevents impossible reservations at both UI and server level.
- [ ] **Honeypot anti-spam** — hidden field; Worker rejects submissions with it filled. Lightweight bot protection.
- [ ] **Staging branch workflow** — test on Cloudflare preview URL before promoting to main/prod.

### Add After Validation (v1.x)

Features to add once the core system is confirmed working in production.

- [ ] **Automated reminder SMS (24h before)** — trigger: owner reports guests are forgetting reservations; requires scheduled Worker or Cron Trigger.
- [ ] **Admin read endpoint** — simple JSON listing of upcoming reservations queryable by the owner directly; trigger: owner wants visibility without Base44 app.

### Future Consideration (v2+)

Features to defer until explicitly requested.

- [ ] **Email confirmation** — defer: SMS covers the need; add only if owner requests it or SMS delivery is unreliable.
- [ ] **Cancellation by phone-linked token** — defer: too complex for MVP; owner handles cancellations by phone.
- [ ] **Capacity tracking per slot** — defer: owner manages this manually; only add if overbooking becomes a real problem.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| HTML booking form (replaces GHL iframe) | HIGH | LOW | P1 |
| Client SMS confirmation | HIGH | LOW | P1 |
| Owner SMS notification | HIGH | LOW | P1 |
| Cloudflare Worker backend | HIGH | MEDIUM | P1 |
| D1 reservation storage | MEDIUM | LOW | P1 |
| Monday + past date blocking | MEDIUM | LOW | P1 |
| Client-side form validation | HIGH | LOW | P1 |
| Server-side validation | HIGH | LOW | P1 |
| Honeypot anti-spam | LOW | LOW | P1 |
| Staging branch / preview URL | HIGH (for safety) | LOW | P1 |
| Automated reminder SMS | MEDIUM | MEDIUM | P2 |
| Admin read endpoint | LOW | LOW | P2 |
| Email confirmation | LOW | MEDIUM | P3 |
| Cancellation flow | LOW | HIGH | P3 |
| Capacity limits | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (MVP)
- P2: Should have, add after MVP is validated
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

This project competes with Go High Level (the system it replaces), not with OpenTable or SevenRooms. The relevant comparison is "what does GHL give us today" vs "what does the custom system give us."

| Feature | Go High Level (current) | Custom System (target) |
|---------|------------------------|----------------------|
| Booking widget | Iframe embed (external brand) | Native HTML form (site brand) |
| Client confirmation | Automatic via GHL | Twilio SMS from Worker |
| Owner notification | Via n8n → Twilio (2 services) | Direct Twilio from Worker (1 service) |
| Data storage | GHL CRM (third-party, paid) | D1 (owned, free tier) |
| Closed day blocking | GHL calendar config | Custom JS + server validation |
| Cost | GHL monthly subscription | Twilio per-SMS + Cloudflare free tier |
| Dependency count | 3 (GHL, n8n, Twilio) | 1 (Twilio) |
| Form customization | Limited (GHL controls UX) | Full control (custom HTML/CSS) |
| Booking admin view | GHL dashboard | Base44 app (separate project) |

The custom system wins on: cost, dependency count, form UX control, and data ownership.
The custom system loses on: built-in CRM features, waitlist, multi-channel booking discovery — none of which are needed by this restaurant.

---

## SMS Content Specification

Based on research into what guests need and French SMS conventions:

### Client confirmation SMS (French)

```
Bonjour [Prenom], votre reservation au Restaurant La Canne a Sucre est confirmee :
- Date : [Jour] [Date]
- Service : [Midi / Soir]
- Couverts : [N]
Pour annuler, appelez le 04 XX XX XX XX.
```

Key elements: restaurant name, date, service (not just time), party size, cancellation phone number.
Keep under 160 characters per segment to avoid multi-part SMS charges.

### Owner notification SMS (French)

```
Nouvelle reservation :
[Prenom] [Nom] - [N] pers.
[Jour] [Date] - [Service]
Tel : [Telephone]
Email : [Email]
```

Key elements: full name, party size, date, service, phone (to call if needed), email (for records).

---

## Sources

- [The 13 Best Online Restaurant Reservation Systems (2026) — EatApp](https://restaurant.eatapp.co/blog/online-restaurant-reservation-systems) — MEDIUM confidence (overview article)
- [Top 10 Features Restaurant Owners Want in a Reservation System (2025) — UpSalt](https://www.upsalt.io/en/restaurants/top-features-restaurant-reservation-system-2025/) — MEDIUM confidence (industry guide)
- [Why SMS Confirmations Stop Restaurant No-Shows — Tableo](https://tableo.com/technology-innovation/restaurant-sms-confirmations/) — MEDIUM confidence
- [How to Create Effective Restaurant SMS Templates in 2025 — SmartSMSSolutions](https://smartsmssolutions.com/resources/blog/sms-templates/business-message-templates/how-to-create-effective-restaurant-sms-templates-in-2025) — MEDIUM confidence
- [Resy seamlessly connects restaurants and diners with Twilio Messaging — Twilio](https://customers.twilio.com/en-us/resy) — HIGH confidence (official Twilio case study)
- [How to Reduce No-Shows in 2025 — UpSalt](https://www.upsalt.io/en/reservation-system/how-to-reduce-no-shows-in-2025/) — MEDIUM confidence
- [The Full Guide to Restaurant Reservation Confirmation Emails — Tablein](https://www.tablein.com/blog/restaurant-reservation-confirmation-emails) — MEDIUM confidence
- [Best Booking Systems for Restaurants in 2026 — Square](https://squareup.com/gb/en/the-bottom-line/operating-your-business/best-booking-systems-for-restaurants) — MEDIUM confidence
- Project requirements: `.planning/PROJECT.md` — HIGH confidence (owner-defined scope)
- Existing codebase analysis: `index.html` line 2681 (GHL iframe embed) — HIGH confidence (direct observation)

---

*Feature research for: Restaurant reservation system — La Canne a Sucre*
*Researched: 2026-02-26*
