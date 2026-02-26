# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**Reservation Management:**
- Optyms - Booking system for restaurant reservations
  - Widget ID: `uEgzRczdrZRnr2xmIG1V`
  - Integration: Iframe embed + JavaScript SDK
  - Location in codebase: `index.html` line 2681
  - Purpose: Handles all reservation submissions from the website
  - Note: PRD indicates future integration with Airtable-based system (not yet implemented)

**Reviews & Reputation:**
- Reputation Hub - Review widget for customer testimonials
  - Widget script: `https://reputationhub.site/reputation/assets/review-widget.js`
  - Location in codebase: `index.html` line 2711
  - Purpose: Display customer reviews and ratings
  - Auth: Service-based authentication (no visible API key in HTML)

**Maps & Location:**
- Google Maps - Location embed for restaurant address
  - Embedded iframe URL: `https://maps.google.com/maps?...`
  - Location: `index.html` line 2884
  - Address encoded: 6 Rue du 14 juillet, Alès 30100 France
  - Purpose: Show restaurant location on website

## Data Storage

**Current System:**
- Not detected in existing website code
- Static HTML files only

**Future Integration (Per PRD):**
- Airtable - Primary database for reservations (planned)
  - Will connect via Airtable API
  - Tables: `clients`, `reservations`, `settings`
  - Status: Not yet integrated into current website
  - Critical: Must connect to existing Airtable base (not create new one)

**File Storage:**
- Local filesystem only
- Image assets: `Medias/images/` (JPEG, PNG)
- Video assets: `Medias/videos/` (MP4)

**Caching:**
- None detected
- Browser-level caching via HTTP headers (not configured in visible code)

## Authentication & Identity

**Current Implementation:**
- None - Static website with no auth
- Optyms booking form handles its own authentication

**Future Requirements (Per PRD):**
- Mobile app authentication (for Base44 reservation management app)
- Not yet implemented in current website

## Monitoring & Observability

**Error Tracking:**
- Not detected
- Console logging present in JavaScript (basic debugging)
  - Example: `console.log('Reservation submitted:', {...})` at line 3403

**Logs:**
- Browser console only
- No server-side logging
- No analytics platform detected

**Analytics:**
- Not detected in current codebase
- No Google Analytics or Mixpanel script tags

## CI/CD & Deployment

**Hosting:**
- Not explicitly visible in codebase
- Appears to be static site hosting (GitHub Pages, Netlify, Vercel, or similar)
- GitHub repository present (checked via git)

**Version Control:**
- Git repository: `.git/` directory present
- Recent commits indicate active development:
  - "Update formulaire de reservation + suppression false scarcity"
  - "Ajout du bon numéro de téléphone"
  - "Ajout de la page des autres prestations"

**CI Pipeline:**
- Not detected
- No GitHub Actions, GitLab CI, or CircleCI configuration found

**Build System:**
- None - Direct HTML/CSS/JS deployment (no build step needed)

## Environment Configuration

**Required Environment Variables:**
- None currently used in website code
- Future requirements for Airtable integration:
  - `AIRTABLE_API_KEY` (to be provided)
  - `AIRTABLE_BASE_ID` (for Base44 reservation app)
  - `AIRTABLE_TABLES` (client IDs for tables)

**Secrets Location:**
- No .env files present
- No secrets management detected in current website
- Optyms widget ID is public (embedded in HTML)

**Configuration Files:**
- None detected
- Settings hardcoded in HTML

## Webhooks & Callbacks

**Incoming Webhooks:**
- Not detected in current website
- PRD mentions n8n for business logic and automations (not visible in current code)

**Outgoing Webhooks:**
- Optyms → Unknown backend (reservations submitted to Optyms widget)
- Google Forms/Optyms may send confirmation emails
- Contact form has simulated submission (lines 3384-3441 in `index.html`)
  - Actual backend submission endpoint not implemented
  - Currently uses 1500ms timeout simulation

**Email Notifications:**
- Contact/reservation confirmation emails mentioned in FAQ (line 2815)
- Email addresses in use:
  - `reservation@lacanneaasucre.com` (mentioned in FAQ)
  - `contact@restaurantlacanneasucre.com` (in footer, line 2870)
  - Actual email integration not visible in code

## Contact Information (From Website)

**Phone:**
- Primary: +33 6 51 84 15 61 (line 2862)

**Email:**
- Contact: contact@restaurantlacanneasucre.com (line 2870)
- Reservations: reservation@lacanneaasucre.com (line 2815, FAQ section)

**Address:**
- 6 rue du 14 Juillet
- 30100 Alès
- France

## Social Media Integration

**Social Links Present (Footer):**
- Facebook - Link present but href="#" (not connected, line 2902)
- Instagram - Link present but href="#" (not connected, line 2903)
- TripAdvisor - Link present but href="#" (not connected, line 2904)
- Note: Links are not functional in current codebase

## Third-Party Scripts

**All External Scripts (in load order):**

1. Google Fonts (preconnect + stylesheet load)
   - URLs: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
   - Purpose: Typography (Poppins, Cormorant Garamond)

2. Font Awesome 6.0.0
   - URL: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css`
   - Purpose: Icons throughout site

3. Optyms Booking Widget
   - Script: `https://api.optyms.com/js/form_embed.js`
   - Type: Widget embed + iframe
   - Purpose: Reservation booking system

4. Reputation Hub Review Widget
   - Script: `https://reputationhub.site/reputation/assets/review-widget.js`
   - Purpose: Display customer reviews

5. Google Maps (iframe embed)
   - URL: `https://maps.google.com/maps`
   - Purpose: Restaurant location map

## Data Flow Summary

**Website → Optyms:**
- User fills reservation form in Optyms widget iframe
- Submission handled by Optyms (not visible in website JavaScript)
- No direct API calls from website to Optyms

**Form Submission (Current - Non-functional):**
- User fills `.reservation-form` on website
- Form handler at line 3384 in `index.html`
- Currently simulated (no actual backend endpoint)
- Comment at line 3401: "Simulate API call (would be replaced with actual API call)"

**Future Data Flow (Per PRD):**
- Website → Airtable (via API)
- Mobile app (Base44) ← → Airtable (via API)
- Airtable → n8n (automations and business logic)

---

*Integration audit: 2026-02-26*
