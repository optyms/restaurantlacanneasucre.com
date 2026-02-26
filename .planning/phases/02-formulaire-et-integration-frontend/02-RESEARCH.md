# Phase 2: Formulaire et Integration Frontend - Research

**Researched:** 2026-02-26
**Domain:** HTML natif + Vanilla JS (fetch, validation, datepicker) — integration avec POST /api/reservations Cloudflare Pages
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Ordre des champs**: Identite d'abord (prenom, nom, telephone, email), puis reservation (date, heure, convives)
- **Confirmation de succes**: Message inline remplacant le formulaire — affiche prenom, date, heure, nb convives + mention SMS — bouton "Nouvelle reservation"
- **Erreurs inline par champ**: Bordure rouge + message sous le champ concerne
- **Erreurs globales**: (reseau, serveur) message en haut du formulaire
- **Marquage erreur**: Uniquement apres interaction (pas au chargement initial)
- **Validation au blur**: + re-validation complete au submit
- **Telephone**: Input libre, placeholder "06 12 34 56 78", validation accepte 06/07/+33, pas de masque de saisie
- **Elements conserves**: Titre "Reservez votre table maintenant" et sous-titre, infos contact et horaires sous le formulaire, bouton flottant mobile "Reserver" (scrolle vers #reservation)

### Claude's Discretion

- Disposition des champs (grille 2 colonnes, une colonne, ou mixte) — adapter au responsive
- Presentation des creneaux horaires (select avec optgroups, boutons toggle, ou autre)
- Nombre de convives : logique 1-8 avec message pour groupes > 8 — approche au choix
- Indicateur de chargement pendant la soumission (spinner bouton, overlay, etc.)
- Comportement sur erreur serveur (garder donnees + message, bouton reessayer, etc.)
- Style du fond de la section (garder le vert primary actuel ou adapter)
- Texte et icone du bouton de soumission
- Position des infos contact (dessous ou dessus le formulaire)
- Choix du datepicker (natif navigateur ou composant custom) — bloquer lundis + dates passees dans tous les cas

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FORM-01 | Formulaire HTML natif remplace l'iframe Go High Level (Optyms) dans la section reservation | Section Architecture Patterns: remplacement du bloc `<div>` iframe par `<form id="reservation-form">` dans index.html |
| FORM-02 | Champs : prenom, nom, telephone, email, date, creneau horaire, nombre de convives | Section Code Examples: structure HTML complete du formulaire avec tous les champs |
| FORM-03 | Creneaux horaires fixes : service Midi (12h, 12h30, 13h, 13h30) et Soir (19h, 19h30, 20h, 20h30, 21h) | Section Code Examples: `<select>` avec `<optgroup>` Midi/Soir |
| FORM-04 | Le lundi est bloque dans le datepicker | Section Architecture Patterns: `min` attribute + `input[type=date]` `change` event validator — ou custom datepicker |
| FORM-05 | Les dates passees sont bloquees dans le datepicker (min = aujourd'hui) | Section Code Examples: `input.min = new Date().toISOString().slice(0,10)` initialise au chargement |
| FORM-06 | Validation client-side : champs requis, format telephone francais, format email, date valide | Section Code Examples: regex FRENCH_PHONE_RE + patterns email + logique blur/submit |
| FORM-07 | Feedback visuel de succes apres soumission reussie (message inline) | Section Architecture Patterns: remplacement du formulaire par un `<div>` confirmation inline |
| FORM-08 | Feedback visuel d'erreur en cas de probleme (erreur reseau, validation serveur) | Section Architecture Patterns: affichage `.form-error-global` en haut du formulaire |
| FORM-09 | Champ honeypot cache pour protection anti-spam | Section Code Examples: `<input type="text" name="website" tabindex="-1" autocomplete="off">` caché via CSS |
| FORM-10 | Formulaire responsive et mobile-friendly | Section Architecture Patterns: CSS grid avec breakpoints existants (768px single-column) |
| CODE-01 | Nouveau JavaScript dans un fichier JS separe (pas inline dans index.html) | Section Architecture Patterns: `<script src="/js/reservation.js" defer></script>` — fichier externe |
| MIGR-01 | Iframe Go High Level (Optyms) supprimee de index.html et remplacee par le nouveau formulaire | Section Architecture Patterns: suppression des lignes 2679-2683 et remplacement par le formulaire HTML |
</phase_requirements>

---

## Summary

Phase 2 is a pure frontend implementation: replace an Optyms/GHL iframe with a native HTML form that connects to the already-built `POST /api/reservations` endpoint (Phase 1). There are no new libraries to install, no build step, and no framework to configure. The stack is vanilla HTML/CSS/JS because the site is a single static `index.html` served by Cloudflare Pages.

The primary technical challenges are: (1) blocking Mondays in the native `<input type="date">` without a custom datepicker — this requires a combination of the `min` attribute and a `change` event handler that rejects Mondays with a user-facing error; (2) the validation-on-blur pattern requires per-field state tracking to avoid marking untouched fields as errors; (3) the JS file must be external (CODE-01) and attached with `defer` to avoid blocking render.

The existing codebase provides all needed CSS foundations: `.reservation-form`, `.form-group`, color variables (`--color-primary`, `--color-primary-dark`), and the responsive grid breakpoint at 768px (single column). The commented-out form skeleton in index.html (lines 2634-2673) and the existing placeholder JS (lines 3383-3441) provide starting points but must be substantially extended.

**Primary recommendation:** Use native `<input type="date">` with a Monday-blocking `change` handler (no external datepicker library), vanilla `fetch()` for the API call, and a per-field touched-state map for blur validation. All JS goes in a new file `/js/reservation.js` loaded with `defer`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vanilla HTML/CSS/JS | N/A | Form, styles, fetch | No framework in project — adding React/Vue for a single form would be over-engineering |
| Native `<input type="date">` | Browser built-in | Date picker | Already used in commented-out form; works on all target browsers; no CDN dependency |
| `fetch()` API | Browser built-in | POST to /api/reservations | Already in the project's placeholder JS; supported in all modern browsers |
| Font Awesome 6.0.0 | Already loaded in index.html | Icons (spinner, check, etc.) | Already loaded via CDN in `<head>` — zero additional cost |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| CSS custom properties (`:root`) | Already in index.html | Design token consistency | Use existing `--color-primary`, `--color-primary-dark`, `--color-accent`, `--border-radius-*`, `--transition-*` |
| CSS Grid | Already in `.reservation-form` | Responsive form layout | Grid already declared at 3 columns (≥768px) and 1 column (<768px) in existing CSS |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `<input type="date">` | Flatpickr / Pikaday / Air Datepicker | Custom datepickers allow Monday disable natively, but add a CDN dependency and an external `.css`. The native approach is zero-dep; Monday blocking via a `change` event validator works fine. Only choose custom if native UI is deemed unacceptable after review. |
| Vanilla JS `fetch()` | Axios | Axios is 14KB min+gz for no real gain here — `fetch()` is sufficient |
| External JS file | Inline `<script>` in index.html | CODE-01 explicitly requires external file. Inline is explicitly out of scope. |

**Installation:** None required. All libraries are either already loaded or built into the browser.

---

## Architecture Patterns

### Recommended Project Structure

After Phase 2, the project will have this additional structure:

```
restaurantlacanneasucre.com/
├── js/
│   └── reservation.js          # NEW — form validation, fetch, feedback (CODE-01)
├── index.html                  # MODIFIED — iframe removed, form HTML added
├── functions/
│   └── api/
│       └── reservations.ts     # UNCHANGED (Phase 1)
└── ...
```

### Pattern 1: HTML Form Structure (Replacing the Iframe)

**What:** Replace lines 2679-2683 in index.html (the `<div>` containing the Optyms iframe) with the native form. The commented-out form skeleton at lines 2634-2673 is also to be uncommented and extended with identity fields.

**Current state of section #reservation (index.html ~2628-2700):**
```html
<!-- Reservation CTA -->
<section id="reservation" class="section reservation-cta">
    <div class="container">
        <div class="reservation-content" data-aos="fade-up">
            <h2 class="reservation-title">Réservez votre table maintenant</h2>  <!-- KEEP -->
            <p class="reservation-text">...</p>                                 <!-- KEEP -->

            <!--form class="reservation-form"> ... </form-->   <!-- UNCOMMENT + EXTEND -->

            <div>
                <iframe src="https://api.optyms.com/..."></iframe>             <!-- REMOVE (MIGR-01) -->
                <script src="https://api.optyms.com/js/form_embed.js"></script><!-- REMOVE (MIGR-01) -->
            </div>

            <div class="reservation-info">...</div>           <!-- KEEP -->
        </div>
    </div>
</section>
```

**Target form structure:**
```html
<form id="reservation-form" class="reservation-form" novalidate>

  <!-- Honeypot (FORM-09) — hidden via CSS, not display:none (some bots detect that) -->
  <div class="form-honeypot" aria-hidden="true">
    <label for="website">Ne pas remplir</label>
    <input type="text" id="website" name="website" tabindex="-1" autocomplete="off">
  </div>

  <!-- Erreur globale (FORM-08) -->
  <div id="form-error-global" class="form-error-global" role="alert" hidden></div>

  <!-- Identite (ordre verrouille par CONTEXT.md) -->
  <div class="form-group">
    <label for="first_name">Prénom *</label>
    <input type="text" id="first_name" name="first_name" required autocomplete="given-name">
    <span class="field-error" id="first_name-error"></span>
  </div>

  <div class="form-group">
    <label for="last_name">Nom *</label>
    <input type="text" id="last_name" name="last_name" required autocomplete="family-name">
    <span class="field-error" id="last_name-error"></span>
  </div>

  <div class="form-group">
    <label for="phone">Téléphone *</label>
    <input type="tel" id="phone" name="phone" required
           placeholder="06 12 34 56 78" autocomplete="tel">
    <span class="field-error" id="phone-error"></span>
  </div>

  <div class="form-group">
    <label for="email">Email *</label>
    <input type="email" id="email" name="email" required autocomplete="email">
    <span class="field-error" id="email-error"></span>
  </div>

  <!-- Reservation -->
  <div class="form-group">
    <label for="date">Date *</label>
    <input type="date" id="date" name="date" required>
    <span class="field-error" id="date-error"></span>
  </div>

  <div class="form-group">
    <label for="time_slot">Créneau horaire *</label>
    <select id="time_slot" name="time_slot" required>
      <option value="">Choisir un créneau</option>
      <optgroup label="Service Midi">
        <option value="12:00">12h00</option>
        <option value="12:30">12h30</option>
        <option value="13:00">13h00</option>
        <option value="13:30">13h30</option>
      </optgroup>
      <optgroup label="Service Soir">
        <option value="19:00">19h00</option>
        <option value="19:30">19h30</option>
        <option value="20:00">20h00</option>
        <option value="20:30">20h30</option>
        <option value="21:00">21h00</option>
      </optgroup>
    </select>
    <span class="field-error" id="time_slot-error"></span>
  </div>

  <div class="form-group">
    <label for="party_size">Nombre de convives *</label>
    <select id="party_size" name="party_size" required>
      <option value="">Sélectionner</option>
      <option value="1">1 personne</option>
      <option value="2">2 personnes</option>
      <option value="3">3 personnes</option>
      <option value="4">4 personnes</option>
      <option value="5">5 personnes</option>
      <option value="6">6 personnes</option>
      <option value="7">7 personnes</option>
      <option value="8">8 personnes</option>
      <option value="9">Plus de 8 — appelez-nous</option>
    </select>
    <span class="field-error" id="party_size-error"></span>
  </div>

  <button type="submit" class="btn btn-reserve" id="submit-btn">
    <i class="fas fa-calendar-check"></i>
    Confirmer ma réservation
  </button>

</form>

<!-- Message de confirmation (FORM-07) — caché par défaut -->
<div id="reservation-success" class="reservation-success" hidden>
  <i class="fas fa-check-circle"></i>
  <h3>Réservation confirmée !</h3>
  <p id="success-details"></p>
  <p>Un SMS de confirmation vous a été envoyé.</p>
  <button type="button" id="new-reservation-btn" class="btn btn-reserve">
    Nouvelle réservation
  </button>
</div>
```

**When to use:** Replace the current iframe block entirely. The title, subtitle, and `.reservation-info` remain in place.

### Pattern 2: Native Datepicker Monday Blocking (FORM-04, FORM-05)

**What:** `<input type="date">` supports `min` attribute to block past dates. Blocking Mondays requires a `change` event handler that validates the selected day-of-week.

**Why not a custom datepicker:** Zero dependency, no CDN, no extra CSS. The native picker is sufficient for this use case. The Monday restriction is enforced both client-side (UX) and server-side (BACK-02, already implemented).

**Example:**
```javascript
// In /js/reservation.js
const dateInput = document.getElementById('date');

// FORM-05: set min to today on load
function setDateMin() {
  dateInput.min = new Date().toISOString().slice(0, 10);
}

// FORM-04: block Mondays
function isMonday(dateString) {
  // Use T12:00:00Z to match server-side logic (UTC-safe)
  return new Date(dateString + 'T12:00:00Z').getUTCDay() === 1;
}

dateInput.addEventListener('change', () => {
  if (dateInput.value && isMonday(dateInput.value)) {
    showFieldError('date', 'Le restaurant est fermé le lundi. Choisissez un autre jour.');
    dateInput.value = ''; // Clear invalid Monday selection
  } else {
    clearFieldError('date');
  }
});
```

**Limitation:** Native date pickers do not visually grey out Mondays in the calendar view — users can click Monday, but the `change` handler immediately clears it and shows an error. This is acceptable given the decision to avoid external datepicker libraries (CONTEXT.md Claude's Discretion).

### Pattern 3: Blur/Submit Validation with Touched State (FORM-06)

**What:** Fields are marked as "touched" on first blur. Errors show only for touched fields. On submit, all fields are marked touched and validated.

**Why:** Prevents showing errors on untouched fields at page load (locked in CONTEXT.md).

**Example:**
```javascript
// Touched state map
const touched = {};

// Regex from server (functions/api/reservations.ts) — keep in sync
const FRENCH_PHONE_RE = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/;

function validateField(name, value) {
  switch (name) {
    case 'first_name':
    case 'last_name':
      return value.trim().length > 0 ? null : 'Ce champ est requis.';
    case 'phone': {
      if (!value.trim()) return 'Ce champ est requis.';
      // Normalize spaces before testing: "06 12 34 56 78" → "0612345678"
      const normalized = value.replace(/\s/g, '');
      return FRENCH_PHONE_RE.test(normalized)
        ? null
        : 'Format invalide. Ex : 06 12 34 56 78 ou +33 6 12 34 56 78';
    }
    case 'email':
      if (!value.trim()) return 'Ce champ est requis.';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Adresse email invalide.';
    case 'date':
      if (!value) return 'Veuillez choisir une date.';
      if (isMonday(value)) return 'Le restaurant est fermé le lundi.';
      return null;
    case 'time_slot':
      return value ? null : 'Veuillez choisir un créneau.';
    case 'party_size':
      return value ? null : 'Veuillez indiquer le nombre de convives.';
    default:
      return null;
  }
}

// Attach blur listeners
['first_name', 'last_name', 'phone', 'email', 'date', 'time_slot', 'party_size'].forEach(name => {
  const el = document.getElementById(name);
  if (!el) return;
  el.addEventListener('blur', () => {
    touched[name] = true;
    const error = validateField(name, el.value);
    error ? showFieldError(name, error) : clearFieldError(name);
  });
});
```

### Pattern 4: fetch() Submit + Feedback (FORM-07, FORM-08)

**What:** `preventDefault()`, collect form data, POST to `/api/reservations`, handle 201 (success) and errors (network, 400, 500).

**API contract (from functions/api/reservations.ts, Phase 1):**
- **Request**: `Content-Type: application/json`, body matches `reservationSchema`
- **Success 201**: `{ id, message, warnings? }`
- **Error 400**: `{ error: string, details?: { fieldErrors, formErrors } }`
- **Error 500**: `{ error: string }`

```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Mark all as touched and validate
  const fields = ['first_name', 'last_name', 'phone', 'email', 'date', 'time_slot', 'party_size'];
  let valid = true;
  fields.forEach(name => {
    touched[name] = true;
    const el = document.getElementById(name);
    const error = validateField(name, el.value);
    if (error) { showFieldError(name, error); valid = false; }
    else clearFieldError(name);
  });
  if (!valid) return;

  // Loading state
  setSubmitting(true);

  // Normalize phone (strip spaces before sending)
  const phoneRaw = document.getElementById('phone').value;
  const phoneNormalized = phoneRaw.replace(/\s/g, '');

  const payload = {
    first_name:  document.getElementById('first_name').value.trim(),
    last_name:   document.getElementById('last_name').value.trim(),
    phone:       phoneNormalized,
    email:       document.getElementById('email').value.trim(),
    date:        document.getElementById('date').value,
    time_slot:   document.getElementById('time_slot').value,
    party_size:  parseInt(document.getElementById('party_size').value, 10),
    honeypot:    document.getElementById('website').value,
  };

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      // FORM-07: show inline success message
      showSuccess(payload);
    } else {
      const data = await res.json();
      showGlobalError(data.error || 'Une erreur est survenue. Veuillez réessayer.');
    }
  } catch {
    // Network error
    showGlobalError('Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.');
  } finally {
    setSubmitting(false);
  }
});
```

### Pattern 5: Success State (FORM-07)

**What:** Hide the form, show the confirmation div with personalized details. "Nouvelle reservation" button resets and shows the form.

```javascript
function showSuccess(payload) {
  const form = document.getElementById('reservation-form');
  const successDiv = document.getElementById('reservation-success');
  const details = document.getElementById('success-details');

  // Build confirmation details
  const dateFormatted = new Date(payload.date + 'T12:00:00Z')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  details.textContent =
    `${payload.first_name}, votre table pour ${payload.party_size} personne(s) ` +
    `est réservée le ${dateFormatted} à ${payload.time_slot}.`;

  form.hidden = true;
  successDiv.hidden = false;
}

document.getElementById('new-reservation-btn').addEventListener('click', () => {
  const form = document.getElementById('reservation-form');
  const successDiv = document.getElementById('reservation-success');
  form.reset();
  Object.keys(touched).forEach(k => delete touched[k]);
  // Clear all field errors
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  clearGlobalError();
  successDiv.hidden = true;
  form.hidden = false;
  // Re-set date min after reset
  setDateMin();
});
```

### Pattern 6: Submitting State (loading indicator)

**What:** Disable the submit button and change its text during the async fetch to prevent double-submit. Claude has discretion on the exact UI — spinner on the button is the most idiomatic approach.

```javascript
function setSubmitting(isSubmitting) {
  const btn = document.getElementById('submit-btn');
  btn.disabled = isSubmitting;
  btn.innerHTML = isSubmitting
    ? '<i class="fas fa-spinner fa-spin"></i> Envoi en cours…'
    : '<i class="fas fa-calendar-check"></i> Confirmer ma réservation';
}
```

### Pattern 7: Field Error / Clear Error Helpers

**What:** Apply/remove error styles and messages. CSS classes control the visual state.

```javascript
function showFieldError(name, message) {
  const input = document.getElementById(name);
  const errorEl = document.getElementById(name + '-error');
  if (input) input.classList.add('field-invalid');
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(name) {
  const input = document.getElementById(name);
  const errorEl = document.getElementById(name + '-error');
  if (input) input.classList.remove('field-invalid');
  if (errorEl) errorEl.textContent = '';
}

function showGlobalError(message) {
  const el = document.getElementById('form-error-global');
  el.textContent = message;
  el.hidden = false;
}

function clearGlobalError() {
  const el = document.getElementById('form-error-global');
  el.textContent = '';
  el.hidden = true;
}
```

### Pattern 8: CSS Extensions Needed

**What:** The existing `.form-group input` / `.form-group select` CSS is a base. New selectors are needed for error states, the global error banner, the success div, and the honeypot.

**New CSS to add (in-document `<style>` or extracted):**
```css
/* Field error state */
.form-group input.field-invalid,
.form-group select.field-invalid {
  border: 2px solid #e53e3e;
  box-shadow: 0 0 0 2px rgba(229, 62, 62, 0.2);
}

/* Error message under field */
.field-error {
  display: block;
  color: #e53e3e;
  font-size: 0.82rem;
  margin-top: 4px;
  min-height: 1.2em; /* prevent layout shift */
}

/* Global error banner */
.form-error-global {
  background-color: #fff5f5;
  border: 1px solid #e53e3e;
  color: #c53030;
  padding: 12px 16px;
  border-radius: var(--border-radius-small);
  margin-bottom: 20px;
  font-size: 0.92rem;
  text-align: left;
}

/* Honeypot — visually hidden but accessible to bots */
.form-honeypot {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Success state */
.reservation-success {
  text-align: center;
  padding: 40px 20px;
  color: white;
}
.reservation-success .fa-check-circle {
  font-size: 3rem;
  color: var(--color-accent);
  margin-bottom: 20px;
}
.reservation-success h3 {
  font-family: var(--font-heading);
  font-size: 1.8rem;
  margin-bottom: 15px;
}
.reservation-success p {
  font-size: 1rem;
  opacity: 0.9;
  margin-bottom: 10px;
}
.reservation-success .btn {
  margin-top: 20px;
}

/* Extended responsive for new identity fields */
@media (max-width: 768px) {
  .reservation-form {
    grid-template-columns: 1fr; /* already defined in existing CSS */
  }
}
```

### Pattern 9: `<script>` Tag in index.html

**What:** Load the external JS file (CODE-01) with `defer` so it doesn't block HTML parsing.

```html
<!-- Before </body> in index.html, after existing <script> block -->
<script src="/js/reservation.js" defer></script>
```

**Important:** The existing inline `<script>` at the bottom of index.html (lines 3226-3443) contains the `DOMContentLoaded` handler for the whole site. The `reservation.js` file must either:
- Be self-contained (wrap its own `DOMContentLoaded` or `defer` handles it), OR
- Simply attach its event listeners at the top level — `defer` guarantees DOM is parsed before the script runs.

**Recommended:** Use `defer` on `<script src="/js/reservation.js">` and attach listeners at top-level scope (no `DOMContentLoaded` needed). This is cleaner.

### Anti-Patterns to Avoid

- **`display: none` for honeypot:** Some bots detect `display:none`. Use the CSS clip/position technique instead.
- **Phone masking/input enforcement:** CONTEXT.md explicitly says no mask on mobile — use `type="tel"` with placeholder only.
- **Blocking submit before blur validation:** Users who tab through and hit submit without touching individual fields should still get all errors shown at once on submit. The `touched` map handles this (mark all touched on submit).
- **Resetting `input[type=date].min` only at load:** After form reset (new-reservation button), `min` must be re-set to today's date since `form.reset()` clears the `min` attribute in some browsers. Call `setDateMin()` after reset.
- **Sending raw phone string with spaces to API:** The server regex `^(?:(?:\+33|0033)[67]|0[67])\d{8}$` does not allow spaces. Strip spaces before sending: `value.replace(/\s/g, '')`.
- **Using `form.elements` to build payload:** Direct `getElementById` is more explicit and avoids issues with form elements that share names.
- **Not including `party_size` as integer:** The API schema expects `party_size` as a `number`, not a string. Use `parseInt(..., 10)`.
- **Appending new `<script>` tags from the external JS file:** The Optyms embed script (`form_embed.js`) is removed in MIGR-01. Ensure no JS code re-inserts it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Datepicker with Monday disable | Custom calendar widget from scratch | Native `<input type="date">` + `change` handler | Works in all modern browsers, zero dependency; Monday UX is a one-line check |
| Email validation | Complex RFC 5322 regex | Simple `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` test | Full RFC regex is overkill and has known false-negatives; server also validates |
| Loading state | Complex state machine | Single boolean + button attribute toggle | `btn.disabled = true` + innerHTML swap is sufficient |
| Form serialization | Custom `FormData` → JSON converter | Direct `document.getElementById(name).value` per field | Explicit is clearer and avoids type coercion issues (especially for `party_size` integer) |

**Key insight:** This is a single form submitting to one endpoint. The complexity is in the UX patterns (blur validation, touched state), not in the technology.

---

## Common Pitfalls

### Pitfall 1: Phone Normalization Mismatch Between Client and Server

**What goes wrong:** User enters "06 12 34 56 78" (with spaces). Client-side regex passes (after stripping spaces), but the raw value is sent to the server. Server regex `^(?:(?:\+33|0033)[67]|0[67])\d{8}$` does not allow spaces → 400 validation error.

**Why it happens:** Client validates `normalized` (no spaces) but `fetch()` sends `payload.phone` which still has spaces.

**How to avoid:** Strip spaces when building the payload: `phone: document.getElementById('phone').value.replace(/\s/g, '')`.

**Warning signs:** Server returns 400 with "Numero de telephone francais metropolitain requis" even when user entered a valid number.

### Pitfall 2: `form.reset()` Does Not Re-Apply `min` on Date Input

**What goes wrong:** After `form.reset()`, the date input's `min` attribute may be cleared in some browsers (Chromium-based browsers clear `min` on reset). Past dates become selectable again.

**Why it happens:** `form.reset()` restores inputs to their default state in HTML. If `min` was set via JavaScript (not the HTML attribute), it is cleared.

**How to avoid:** Always call `setDateMin()` after `form.reset()`:
```javascript
form.reset();
setDateMin(); // re-apply today's date as min
```

**Warning signs:** After clicking "Nouvelle reservation", the user can select yesterday's date.

### Pitfall 3: `party_size` Sent as String Instead of Number

**What goes wrong:** `document.getElementById('party_size').value` returns a string like `"3"`. The server Zod schema expects `party_size` as `z.number().int()`. Zod v3 does NOT coerce by default — the server returns 400.

**Why it happens:** All HTML form values are strings. The API expects a number.

**How to avoid:** Always parse: `party_size: parseInt(document.getElementById('party_size').value, 10)`. Validate it's not `NaN` before sending.

**Warning signs:** Server returns 400 "Donnees invalides" with `fieldErrors.party_size` pointing to a type error.

### Pitfall 4: Large Groups Treated as Regular Reservation

**What goes wrong:** The select includes `<option value="9">Plus de 8 — appelez-nous</option>`. If the user selects this and submits, `party_size: 9` is sent to the server, which accepts up to 20 (`z.number().int().min(1).max(20)`). The reservation goes through with `party_size = 9`, but the owner intended large groups to call instead.

**Why it happens:** CONTEXT.md says "logique 1-8 avec message pour groupes > 8 — approche au choix". The decision is delegated to Claude's Discretion.

**How to avoid (recommended):** Show an informational message when the user selects "9" (more than 8) and prevent form submission, redirecting to phone contact. This is a UX-only change — the server already accepts up to 20 if desired.

```javascript
// In submit handler, before fetch
if (parseInt(document.getElementById('party_size').value, 10) > 8) {
  showGlobalError('Pour les groupes de plus de 8 personnes, veuillez nous appeler au 06 51 84 15 61.');
  return;
}
```

### Pitfall 5: Existing Inline Form JS Conflicts with External File

**What goes wrong:** The existing placeholder JS in index.html (lines 3383-3441) already selects `.reservation-form` and attaches a `submit` listener. If the new external `reservation.js` also attaches a `submit` listener on the same element, both fire.

**Why it happens:** The existing inline `<script>` at the bottom of index.html is part of the site's `DOMContentLoaded` handler. When the new HTML form is added, the old code's `document.querySelector('.reservation-form')` will now find the real form.

**How to avoid:** Remove the old `// Form Submission (Example)` block (lines 3383-3441) from the inline `<script>` when adding the external `reservation.js`. This is part of MIGR-01 / CODE-01 cleanup.

### Pitfall 6: Missing `defer` on `<script src="/js/reservation.js">`

**What goes wrong:** Without `defer`, the external script loads and executes before the DOM is parsed. `document.getElementById('reservation-form')` returns `null`. Event listeners are not attached. The form silently doesn't work.

**Why it happens:** Default `<script>` execution is synchronous and blocks HTML parsing.

**How to avoid:** Always use `<script src="/js/reservation.js" defer></script>`. With `defer`, the script runs after the DOM is fully parsed but before `DOMContentLoaded`.

### Pitfall 7: `<input type="date">` UI Varies by Browser/OS

**What goes wrong:** The native date picker UI looks and behaves differently on iOS Safari vs Chrome on Android vs desktop Chrome/Firefox. iOS Safari in particular has a drum-roll spinner instead of a calendar grid, which makes Monday selection then rejection confusing for the user.

**Why it happens:** Native date inputs are rendered by the OS, not the browser's CSS engine.

**Mitigation:** This is acceptable given the decision to avoid external datepicker libraries (CONTEXT.md Claude's Discretion). The Monday rejection still works correctly on all platforms — the date is cleared and an error message is shown. If user feedback shows this is a significant UX problem, upgrading to Flatpickr (single CDN include) is the documented upgrade path.

---

## Code Examples

### Complete /js/reservation.js

```javascript
// /js/reservation.js
// Phase 2 — Formulaire de reservation natif
// Attached with <script src="/js/reservation.js" defer> in index.html

(function () {
  'use strict';

  // --- Constants (must match functions/api/reservations.ts) ---
  const FRENCH_PHONE_RE = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/;
  const API_URL = '/api/reservations';

  // --- State ---
  const touched = {};

  // --- DOM references ---
  const form        = document.getElementById('reservation-form');
  const successDiv  = document.getElementById('reservation-success');
  const successDetails = document.getElementById('success-details');
  const newResaBtn  = document.getElementById('new-reservation-btn');
  const submitBtn   = document.getElementById('submit-btn');
  const dateInput   = document.getElementById('date');
  const globalError = document.getElementById('form-error-global');

  if (!form) return; // Guard: form not in DOM (e.g., autre page)

  // --- Init ---
  setDateMin();

  // --- Helpers ---
  function setDateMin() {
    dateInput.min = new Date().toISOString().slice(0, 10);
  }

  function isMonday(dateString) {
    return new Date(dateString + 'T12:00:00Z').getUTCDay() === 1;
  }

  function showFieldError(name, message) {
    const input = document.getElementById(name);
    const errorEl = document.getElementById(name + '-error');
    if (input) input.classList.add('field-invalid');
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(name) {
    const input = document.getElementById(name);
    const errorEl = document.getElementById(name + '-error');
    if (input) input.classList.remove('field-invalid');
    if (errorEl) errorEl.textContent = '';
  }

  function showGlobalError(message) {
    globalError.textContent = message;
    globalError.hidden = false;
    globalError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearGlobalError() {
    globalError.textContent = '';
    globalError.hidden = true;
  }

  function setSubmitting(isSubmitting) {
    submitBtn.disabled = isSubmitting;
    submitBtn.innerHTML = isSubmitting
      ? '<i class="fas fa-spinner fa-spin"></i> Envoi en cours\u2026'
      : '<i class="fas fa-calendar-check"></i> Confirmer ma r\u00e9servation';
  }

  // --- Validation ---
  function validateField(name, value) {
    switch (name) {
      case 'first_name':
      case 'last_name':
        return value.trim().length > 0 ? null : 'Ce champ est requis.';
      case 'phone': {
        if (!value.trim()) return 'Ce champ est requis.';
        const normalized = value.replace(/\s/g, '');
        return FRENCH_PHONE_RE.test(normalized)
          ? null
          : 'Format invalide. Ex\u00a0: 06\u00a012\u00a034\u00a056\u00a078 ou +33\u00a06\u00a012\u00a034\u00a056\u00a078';
      }
      case 'email':
        if (!value.trim()) return 'Ce champ est requis.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Adresse email invalide.';
      case 'date':
        if (!value) return 'Veuillez choisir une date.';
        if (isMonday(value)) return 'Le restaurant est ferm\u00e9 le lundi. Choisissez un autre jour.';
        return null;
      case 'time_slot':
        return value ? null : 'Veuillez choisir un cr\u00e9neau.';
      case 'party_size':
        return value ? null : 'Veuillez indiquer le nombre de convives.';
      default:
        return null;
    }
  }

  const FIELDS = ['first_name', 'last_name', 'phone', 'email', 'date', 'time_slot', 'party_size'];

  // --- Blur listeners ---
  FIELDS.forEach(name => {
    const el = document.getElementById(name);
    if (!el) return;
    el.addEventListener('blur', () => {
      touched[name] = true;
      const error = validateField(name, el.value);
      error ? showFieldError(name, error) : clearFieldError(name);
    });
    // Re-validate on change (for selects and date)
    el.addEventListener('change', () => {
      if (!touched[name]) return;
      const error = validateField(name, el.value);
      error ? showFieldError(name, error) : clearFieldError(name);
    });
  });

  // --- Monday blocking on date change ---
  dateInput.addEventListener('change', () => {
    if (dateInput.value && isMonday(dateInput.value)) {
      showFieldError('date', 'Le restaurant est ferm\u00e9 le lundi. Choisissez un autre jour.');
      dateInput.value = '';
    }
  });

  // --- Submit ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearGlobalError();

    // Mark all touched and validate
    let valid = true;
    FIELDS.forEach(name => {
      touched[name] = true;
      const el = document.getElementById(name);
      const error = validateField(name, el ? el.value : '');
      if (error) { showFieldError(name, error); valid = false; }
      else clearFieldError(name);
    });
    if (!valid) return;

    // Large group redirect
    const partySizeVal = parseInt(document.getElementById('party_size').value, 10);
    if (partySizeVal > 8) {
      showGlobalError(
        'Pour les groupes de plus de 8 personnes, veuillez nous appeler au 06\u00a051\u00a084\u00a015\u00a061.'
      );
      return;
    }

    setSubmitting(true);

    const payload = {
      first_name:  document.getElementById('first_name').value.trim(),
      last_name:   document.getElementById('last_name').value.trim(),
      phone:       document.getElementById('phone').value.replace(/\s/g, ''),
      email:       document.getElementById('email').value.trim(),
      date:        dateInput.value,
      time_slot:   document.getElementById('time_slot').value,
      party_size:  partySizeVal,
      honeypot:    document.getElementById('website').value,
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showSuccess(payload);
      } else {
        let errorMessage = 'Une erreur est survenue. Veuillez r\u00e9essayer.';
        try {
          const data = await res.json();
          if (data.error) errorMessage = data.error;
        } catch { /* ignore JSON parse errors */ }
        showGlobalError(errorMessage);
      }
    } catch {
      showGlobalError(
        'Impossible de contacter le serveur. V\u00e9rifiez votre connexion et r\u00e9essayez.'
      );
    } finally {
      setSubmitting(false);
    }
  });

  // --- Success state ---
  function showSuccess(payload) {
    const dateFormatted = new Date(payload.date + 'T12:00:00Z')
      .toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    const nb = payload.party_size;
    successDetails.textContent =
      `${payload.first_name}, votre table pour ${nb} personne${nb > 1 ? 's' : ''} ` +
      `est r\u00e9serv\u00e9e le ${dateFormatted} \u00e0 ${payload.time_slot}.`;
    form.hidden = true;
    successDiv.hidden = false;
  }

  // --- New reservation ---
  if (newResaBtn) {
    newResaBtn.addEventListener('click', () => {
      form.reset();
      setDateMin();
      FIELDS.forEach(name => {
        delete touched[name];
        clearFieldError(name);
      });
      clearGlobalError();
      successDiv.hidden = true;
      form.hidden = false;
    });
  }

})();
```

### Honeypot CSS (anti-visually hidden, accessible to bots)

```css
/* In index.html <style> block, or in reservation.js added dynamically */
.form-honeypot {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Minimum Date Initialization

```javascript
// Sets <input type="date" id="date"> min to today (FORM-05)
// Called at init and after form.reset()
function setDateMin() {
  document.getElementById('date').min = new Date().toISOString().slice(0, 10);
}
```

### Script Tag to Add to index.html

```html
<!-- Add before </body>, after the existing <script> block -->
<script src="/js/reservation.js" defer></script>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Iframe embedding third-party form (GHL/Optyms) | Native HTML form with fetch() | Phase 2 | Full control over UX, styling, validation; no external dependency |
| Toast/floating notifications for form feedback | Inline state replacement (form ↔ success div) | Modern UX practice | Better context — user sees confirmation within the reservation section, not a disappearing toast |
| jQuery for DOM manipulation | Vanilla JS DOM APIs | ~2018-2022 for most projects | No framework needed; `getElementById`, `classList`, `fetch` are sufficient |
| `display: none` for honeypot | CSS clip/position technique | Ongoing best practice | Bots detect `display:none`; clip technique hides from sight but leaves in DOM |

**Deprecated/outdated:**
- The Optyms `form_embed.js` script and iframe — removed entirely in MIGR-01
- The placeholder JS in index.html (lines 3383-3441) — removed when external `reservation.js` takes over
- The commented-out skeleton form (lines 2634-2673) — replaced by the full form with identity fields

---

## Open Questions

1. **Native datepicker Monday UX on iOS Safari**
   - What we know: iOS Safari renders `<input type="date">` as a drum-roll spinner, not a calendar grid. Users can pick any date, then the `change` handler rejects Mondays.
   - What's unclear: Whether the owner / target user base will find this acceptable. iOS Safari market share in France is significant (~30% mobile).
   - Recommendation: Implement with native input for Phase 2. If feedback identifies this as a friction point, upgrade to Flatpickr in a future iteration. Document the upgrade path.

2. **CSS placement for new form styles**
   - What we know: index.html has all CSS in `<style>` blocks inside `<head>`. CODE-01 says JS goes external, but doesn't specify CSS.
   - What's unclear: Whether new form CSS should stay in the `<style>` block in index.html or go in a separate CSS file.
   - Recommendation: Keep new CSS in the existing `<style>` block in index.html (immediately after existing `.reservation-info` styles around line 1226). This avoids adding a build step or a second HTTP request. No new CSS file needed for a small addition.

3. **`party_size` option value "9" vs blocking > 8**
   - What we know: CONTEXT.md says "logique 1-8 avec message pour groupes > 8 — approche au choix" (Claude's Discretion). The server accepts 1-20.
   - What's unclear: Exact option value to use for "more than 8" — using `value="9"` means the server gets 9 if a bot bypasses the JS check.
   - Recommendation: Use `value=""` for the "Plus de 8" option and block submission with a message in JS (not a select with `value="9"`). This makes the client-side check the only gate. The server already enforces its own limits independently.

---

## Sources

### Primary (HIGH confidence)

- **Existing codebase** — `functions/api/reservations.ts` (API contract, Zod schema, phone regex, valid time slots), `index.html` (CSS variables, existing `.reservation-form` styles, breakpoints, existing placeholder JS)
- MDN Web Docs — `<input type="date">`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date — `min` attribute behavior, browser support
- MDN Web Docs — `fetch()`: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch — POST pattern, error handling
- MDN Web Docs — `HTMLFormElement.reset()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reset — behavior on dynamic properties (min resets)
- MDN Web Docs — `<script defer>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#defer — execution timing

### Secondary (MEDIUM confidence)

- Honeypot technique (CSS clip vs display:none) — multiple concordant sources from form security best practices (OWASP, anti-spam communities); consistent with honeypot pattern already implemented in functions/api/reservations.ts (FORM-09)
- iOS Safari `<input type="date">` behavior — multiple developer reports confirming drum-roll spinner; no MDN specific documentation on this rendering difference

### Tertiary (LOW confidence)

- `form.reset()` clearing JS-set `min` attribute — observed behavior in Chromium-based browsers; not explicitly documented in the HTML spec. Mitigation (calling `setDateMin()` after reset) is defensive and harmless regardless.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — vanilla HTML/CSS/JS, no new dependencies, existing codebase verified
- Architecture: HIGH — form structure, fetch pattern, touched-state validation all from established web platform patterns; API contract verified against Phase 1 source code
- Pitfalls: HIGH for phone normalization, party_size type coercion, script conflict (verified against actual codebase); MEDIUM for iOS datepicker UX (multiple reports, no official test); LOW for form.reset() + min behavior (observed, not spec-documented)

**Research date:** 2026-02-26
**Valid until:** 2026-05-26 (stable web platform APIs; browser behavior for native datepicker could improve)
