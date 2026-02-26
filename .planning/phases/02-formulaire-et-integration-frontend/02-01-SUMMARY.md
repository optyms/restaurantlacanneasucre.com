---
phase: 02-formulaire-et-integration-frontend
plan: 01
subsystem: ui
tags: [html-form, vanilla-js, validation, datepicker, honeypot, responsive-css]

# Dependency graph
requires:
  - phase: 01-backend-et-infrastructure
    provides: POST /api/reservations endpoint — field names, validation rules, FRENCH_PHONE_RE regex, API responses (201/400/500)
provides:
  - Native HTML reservation form with 7 fields replacing the Optyms iframe
  - Client-side validation (blur + submit) with touched-state pattern
  - Monday blocking and past-date blocking on date input
  - Honeypot field (name=website) for spam protection
  - External JS file js/reservation.js loaded with defer
  - showSuccess() function ready for Plan 02-02 fetch integration
affects:
  - 02-02 — fetch submit wires into form built here; calls window._reservationShowSuccess

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Touched-state validation: errors show only after blur or submit, never at load"
    - "Monday blocking via change handler + value clear (native date input limitation)"
    - "IIFE with use strict, defer script tag — no DOMContentLoaded wrapper needed"
    - "Phone normalization: strip spaces before FRENCH_PHONE_RE test"
    - "Honeypot hidden via CSS clip/position technique (not display:none — bot-detectable)"

key-files:
  created:
    - js/reservation.js
  modified:
    - index.html

key-decisions:
  - "party_size option value=9 used for 'Plus de 8' to trigger phone-call prompt (not sent to API)"
  - "window._reservationShowSuccess exposed so Plan 02-02 can call it after successful fetch"
  - "Grid updated from 3 columns to 2 columns — 7 fields fit better in 2-col layout"
  - "fetch() call omitted from submit handler — stub comment only, Plan 02-02 implements it"

patterns-established:
  - "Pattern: IIFE for form JS — prevents global scope pollution, loads with defer"
  - "Pattern: validateField() switch — single source of truth for field validation rules"
  - "Pattern: clearFieldError / showFieldError helpers — decouple validation from UI updates"

requirements-completed: [FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, FORM-09, FORM-10, CODE-01]

# Metrics
duration: ~20min
completed: 2026-02-26
---

# Phase 02 Plan 01: Native HTML Reservation Form Summary

**7-field reservation form with blur validation, Monday blocking, honeypot, and external JS replacing Optyms iframe — wired to /api/reservations field contract from Phase 1**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-02-26T18:00:00Z
- **Completed:** 2026-02-26T18:20:12Z
- **Tasks:** 2/2
- **Files modified:** 2 (index.html modified, js/reservation.js created)

## Accomplishments

- Replaced Optyms/GHL iframe with native `<form id="reservation-form">` — 7 fields matching API field names exactly (first_name, last_name, phone, email, date, time_slot, party_size)
- Created `js/reservation.js` (273 lines) with full client-side validation: touched-state blur pattern, FRENCH_PHONE_RE phone validation, Monday blocking via UTC-safe isMonday(), submit validation
- Honeypot field (name=website) visually hidden via CSS clip technique; success div + new-reservation flow fully implemented

## Task Commits

Each task was committed atomically:

1. **Task 1: Build HTML form and CSS in index.html** - `7e5cb03` (feat)
2. **Task 2: Create js/reservation.js with validation and datepicker logic** - `f6be8d3` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `index.html` - Replaced commented form skeleton + Optyms iframe with native form; added CSS for field-invalid, field-error, form-error-global, form-honeypot, reservation-success; grid from 3 to 2 columns; script tag with defer
- `js/reservation.js` - IIFE with full validation: setDateMin, isMonday, validateField (all 7 fields), blur listeners, Monday change handler, submit handler (no fetch yet), showSuccess, handleNewReservation

## Decisions Made

- `party_size` option `value="9"` for "Plus de 8 — appelez-nous": treated as invalid in submit handler (shows global error with phone number), never sent to API
- `window._reservationShowSuccess` exposed on window so Plan 02-02 can call it after successful fetch without modifying the IIFE
- Grid changed from 3 to 2 columns — 7 fields (4 identity + 3 reservation) lay out cleanly in 2 columns on desktop
- `fetch()` left as stub comment in submit handler — Plan 02-02 adds the actual API call with try/catch/finally

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — the Edit tool required two separate passes to replace the commented form skeleton and the iframe `<div>` (they could not be matched as a single block due to whitespace). Each was replaced cleanly in separate operations.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Form is fully functional for client-side validation and UX — ready for Plan 02-02 fetch integration
- `window._reservationShowSuccess(payload)` is the hook for Plan 02-02 to show success state
- No blockers — the existing inline JS at lines ~3450 contains a legacy `reservationForm` query that now finds `#reservation-form`; Plan 02-02 should remove that legacy block

## Self-Check: PASSED

- FOUND: js/reservation.js
- FOUND: index.html (modified)
- FOUND: .planning/phases/02-formulaire-et-integration-frontend/02-01-SUMMARY.md
- FOUND commit: 7e5cb03 (Task 1 - index.html)
- FOUND commit: f6be8d3 (Task 2 - reservation.js)

---
*Phase: 02-formulaire-et-integration-frontend*
*Completed: 2026-02-26*
