# Codebase Concerns

**Analysis Date:** 2026-02-26

## Critical Implementation Gap: Form Submission Not Connected

**API Integration Missing:**
- Issue: Reservation form is functionally disconnected from any backend system. Form submission is entirely client-side with simulated delay.
- Files: `index.html` (lines 3387-3440)
- Impact: **CRITICAL** - Reservations are never persisted. Users believe their reservation is confirmed when it actually vanishes. This directly violates PRD requirement for Airtable integration.
- Evidence: Line 3401 contains comment: `// Simulate API call (would be replaced with actual API call)`
- Fix approach: Implement actual fetch/POST to n8n webhook that pushes reservation data to Airtable. Update form handler to send: date, time, persons, name, email, phone to backend.

---

## Form Data Not Collected Completely

**Missing Required Fields:**
- Issue: Reservation form only collects `date`, `time`, `persons` (lines 3397-3399). Missing critical fields per PRD: name, email, phone, special requests.
- Files: `index.html` (lines 3384-3440)
- Impact: Even if form submitted to backend, data would be incomplete. Cannot identify reservations or contact customers without name/phone.
- Fix approach: Add form fields for name (first/last), email, phone before submitting. Validate required fields before POST.

---

## Hardcoded Contact Information

**Email Configuration:**
- Issue: Contact email addresses are hardcoded in two different formats across codebase
- Files:
  - `autres-prestations.html` line 419: `action="mailto:contact@lacanneasucre.com"`
  - `autres-prestations.html` line 403: `📧 contact@restaurantcanneasucre.fr`
  - `index.html` contains inline contact data
- Impact: Conflicting email addresses. If email changes, must manually edit multiple HTML files. Difficult to maintain.
- Fix approach: Create a shared config/constants object (even as JSON in script) with centralized contact info. Load dynamically.

---

## Nested setTimeout Chains (Callback Hell)

**Code Quality Issue:**
- Issue: Reservation form uses deeply nested setTimeout callbacks (lines 3402-3439) creating unmaintainable async flow
- Files: `index.html` (lines 3414-3437)
- Pattern:
  ```javascript
  setTimeout(() => {                    // 1500ms delay
      setTimeout(() => {                // 2000ms delay
          setTimeout(() => {            // 100ms delay
              setTimeout(() => {        // 5000ms delay
                  setTimeout(() => {    // 300ms delay
  ```
- Impact: Hard to follow logic. Difficult to test. Error handling impossible. Making changes is fragile.
- Fix approach: Replace with async/await or Promise chains. Create named functions for each stage (show loading, send request, show success, hide notification).

---

## Form Submission Without Validation

**No Client-Side Validation:**
- Issue: Form fields (`#date`, `#time`, `#persons`) are never validated before processing
- Files: `index.html` (lines 3397-3407)
- Impact: Invalid/empty reservations could be submitted. No user feedback on validation errors.
- Fix approach: Add HTML5 validation attributes (`required`, `min`, `max`, `pattern`). Add JavaScript validation before line 3402.

---

## Unhandled Form Errors

**No Error Handling:**
- Issue: Form submission simulates success only. No error handling, no network error response, no backend validation errors shown to user.
- Files: `index.html` (lines 3402-3439)
- Impact: If API call fails, user sees nothing. Silent failures. No way to retry.
- Fix approach: Add `.catch()` handler to fetch. Show error message in notification div. Provide retry button.

---

## Gallery Auto-slide Cleanup Missing

**Potential Memory Leak:**
- Issue: `intervalId` from auto-slide carousel (line 2245) is cleared and recreated repeatedly but may not be properly cleaned on page unload
- Files: `index.html` (lines 2243-2270)
- Impact: Multiple intervals could accumulate in memory if page is navigated away. Minimal but detectable over time.
- Fix approach: Add cleanup in `beforeunload` or `pagehide` event. Store all intervals in Set and clear all on exit.

---

## Parallax Effect Causes Layout Thrashing

**Performance Concern:**
- Issue: Scroll event listener continuously calls `offsetHeight` and `offsetTop` (lines 3373-3374) without debounce
- Files: `index.html` (lines 3371-3381)
- Impact: Scroll event fires 60+ times per second. Each call triggers layout recalculation. Creates jank on older mobile devices (key audience per PRD).
- Fix approach: Debounce scroll handler. Use `requestAnimationFrame` instead of direct DOM reads. Cache offsetTop/Height values.

---

## IntersectionObserver Configuration Incomplete

**Animation Trigger Issues:**
- Issue: AOS animation observer threshold set to 0.15 (line 3350) but no viewport margin specified
- Files: `index.html` (lines 3349-3364)
- Impact: Elements animate late (when already visible). Better UX would be triggering at 0.3 (more lead time). No margin means animation doesn't trigger for partial elements.
- Fix approach: Adjust threshold to 0.3. Add `rootMargin: '50px'` to observe earlier.

---

## External CDN Dependencies Without Fallback

**Availability Risk:**
- Issue: Critical assets loaded from CDN with no fallback:
- Files: `index.html` (lines 7-10)
  - Google Fonts: `fonts.googleapis.com`
  - Google Fonts Static: `fonts.gstatic.com`
  - Font Awesome: `cdnjs.cloudflare.com`
- Impact: If CDN is down, fonts fail to load. Icons missing. Site degrades significantly.
- Fix approach: Host fonts locally or use system fonts as primary. Provide fallback icon set. Test offline mode.

---

## Modal Close Button Text Is Unicode Character

**Accessibility Issue:**
- Issue: Modal close button uses HTML entity `&times;` (line 417 in autres-prestations.html)
- Files: `autres-prestations.html` line 417
- Impact: Screen readers read as "times" character, not "close button". No aria-label. Keyboard navigation may not work.
- Fix approach: Add `aria-label="Fermer"` and `role="button"`. Replace with semantic button element or use `aria-label` with proper text.

---

## Mail-To Form Without Backend Processing

**Form Submission Method Broken:**
- Issue: Quote request form uses `action="mailto:contact@lacanneasucre.com"` (autre-prestations.html line 419)
- Files: `autres-prestations.html` (lines 419-449)
- Impact: Form submits emails directly from browser, exposing email address in source code. No server-side validation, no confirmation email. No storage.
- Fix approach: Replace with POST to backend endpoint. Implement proper email handling via n8n workflow.

---

## No Page Load Performance Tracking

**Monitoring Absent:**
- Issue: No analytics, error tracking, or performance monitoring visible in codebase
- Files: Both HTML files
- Impact: Cannot detect when users have poor experience. No data on form submission success rate. Silent failures.
- Fix approach: Add Sentry (error tracking) or similar. Add basic Analytics.js or GA4 for conversion tracking.

---

## Responsive Design Gaps

**Mobile Layout Issues:**
- Issue: Hero section header text (line 201 in index.html) color is hardcoded white, but on scroll becomes primary color. On mobile with certain scroll states, can be unreadable.
- Files: `index.html` (lines 197-210)
- Impact: Navigation links unreadable on certain scroll positions on mobile devices (core audience per PRD - mobile-first).
- Fix approach: Ensure sufficient contrast ratio at all times. Test with DevTools mobile view. Consider different color strategy for scrolled state.

---

## Color Palette Mismatch Across Pages

**Design Inconsistency:**
- Issue: `index.html` uses different primary color than `autres-prestations.html`
- Files:
  - `index.html` line 13: `--color-primary: #C2703D`
  - `autres-prestations.html` line 9: `--color-primary: #a9441b`
- Impact: When navigating between pages, visual identity breaks. Users may think they're on different sites.
- Fix approach: Create shared CSS file or design tokens. Use same colors everywhere. Document color palette in central location.

---

## Image Paths May Break

**Path Dependency Risk:**
- Issue: Image sources reference relative paths like `./Medias/images/` scattered throughout both HTML files
- Files:
  - `index.html` (various image src attributes)
  - `autres-prestations.html` line 57: `./Medias/images/veau-bannanes-plantain-focus.jpg`
- Impact: If directory structure changes, all images break simultaneously. No image optimization/lazy loading.
- Fix approach: Centralize image paths in config. Implement lazy loading with `loading="lazy"`. Use CDN for images instead of local files. Optimize image sizes for mobile.

---

## No Environment Variable Configuration

**Hardcoded Configuration:**
- Issue: All URLs, endpoints, and API keys (if they existed) would be hardcoded in source
- Files: Both HTML files
- Impact: Cannot deploy to different environments (dev/staging/prod) without editing HTML. Security risk if credentials were added.
- Fix approach: Even for static site, use build-time environment variables. Create `.env` file (not committed). Load config at runtime via JavaScript module.

---

## Missing Service Worker

**Offline Support Absent:**
- Issue: No service worker or offline fallback for PWA functionality
- Files: Not present
- Impact: Page fails completely without internet. No caching strategy. Users must reload to get fresh data.
- Fix approach: Implement basic service worker with cache-first strategy for static assets. At minimum cache HTML/CSS/JS on first load.

---

## Test Coverage

**Untested Code:**
- What's not tested: All form submission logic, animation triggers, modal open/close, gallery navigation
- Files: `index.html` (lines 2243-3441)
- Risk: Changes to form logic, gallery, or animations break silently. No regression detection.
- Priority: High - Form submission is revenue-critical path

---

## Missing Documentation on Integration Points

**n8n/Airtable Integration Undefined:**
- Issue: PRD explicitly states n8n will handle automation and Airtable integration (Section 8), but no implementation details, webhook URLs, or API documentation in codebase
- Files: No integration code present anywhere
- Impact: Developers cannot implement form → Airtable flow without external documentation. Easy to implement wrong.
- Fix approach: Document webhook endpoint URL. Create example POST payload. Add comments in form submission code with expected field names/types.

---

## Security: Form Data Sent Over Unknown Protocol

**HTTPS Not Enforced:**
- Issue: Form collection code has no HTTPS validation or certificate pinning
- Files: `index.html` (lines 3397-3407)
- Impact: On HTTP connection, reservation data (email, phone) sent unencrypted. Man-in-the-middle vulnerability.
- Fix approach: Add HTTPS check. Redirect HTTP to HTTPS. Use `secure` flag on fetch requests.

---

## Accessibility: Missing ARIA Labels

**Screen Reader Issues:**
- Issue: Modal dialogs, buttons, and form fields lack ARIA labels
- Files:
  - `autres-prestations.html` lines 415-449 (modal structure)
  - `index.html` form elements (lines 3384-3440)
- Impact: Users with screen readers cannot use quote forms or modals. WCAG violation.
- Fix approach: Add `aria-modal="true"`, `aria-labelledby`, `aria-describedby` to modals. Add labels to all form inputs.

---

## Browser Compatibility

**No Vendor Prefixes or Polyfills:**
- Issue: Code uses modern CSS/JS without checking support or providing fallbacks
- Files: Both HTML files use `backdrop-filter`, `transform`, `IntersectionObserver` without detection
- Impact: Older browsers (IE11 still in use) will have broken styling/functionality.
- Fix approach: Add feature detection. Provide CSS fallbacks. Consider polyfills for `IntersectionObserver` if supporting older browsers.

---

*Concerns audit: 2026-02-26*
