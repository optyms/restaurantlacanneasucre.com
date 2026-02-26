---
phase: 02-formulaire-et-integration-frontend
verified: 2026-02-26T23:00:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: false
human_verification:
  - test: "Soumettre une reservation valide sur staging et verifier la confirmation"
    expected: "Le message de confirmation apparait avec prenom, date, heure, nb convives. Le SMS arrive sur le telephone du client et du proprietaire (0651841561) et du CC (0619614643)."
    why_human: "La confirmation SMS necessite un vrai telephone et un deploiement staging actif avec les secrets Twilio configures. Impossible a verifier par grep."
  - test: "Verifier l'apparence visuelle du formulaire sur le site"
    expected: "Le formulaire s'integre aux couleurs du site (vert/blanc), les champs sont lisibles, les messages d'erreur en rouge sont visibles, la grille 2 colonnes desktop / 1 colonne mobile est correcte."
    why_human: "Le rendu visuel et la coherence avec le design existant ne peuvent pas etre verifies par analyse statique."
  - test: "Tester la validation blur champ par champ en navigation clavier"
    expected: "Les erreurs n'apparaissent qu'apres avoir quitte le champ (blur), jamais au chargement. Le telephone '01 23 45 67 89' declenche une erreur. Le '06 12 34 56 78' passe."
    why_human: "Le comportement interactif du touched-state pattern ne peut pas etre simule par grep."
  - test: "Selectionner un lundi dans le datepicker"
    expected: "Le champ date est vide apres selection, un message 'Le restaurant est ferme le lundi' s'affiche immediatement."
    why_human: "L'interaction native du datepicker et le clear de valeur ne peuvent pas etre verifies statiquement."
---

# Phase 02: Formulaire et Integration Frontend — Rapport de Verification

**Phase Goal:** Les clients peuvent remplir et soumettre le formulaire de reservation directement sur le site — sans iframe, sans Go High Level
**Verified:** 2026-02-26T23:00:00Z
**Status:** HUMAN_NEEDED — tous les checks automatises passent, 4 items necessitent verification humaine
**Re-verification:** Non — verification initiale

---

## Criteres de Succes (depuis ROADMAP.md)

| # | Critere | Statut | Evidence |
|---|---------|--------|----------|
| 1 | L'iframe Go High Level n'est plus visible dans la section reservation — remplacee par un formulaire HTML natif aux couleurs du site | VERIFIED | `grep -c "optyms" index.html` retourne 0. `id="reservation-form"` present a la ligne 2702. Les iframes restantes (reputationhub.site a la ligne 2829 et Google Maps a la ligne 3001) sont sans rapport avec GHL. |
| 2 | Le lundi est inaccessible dans le datepicker et les dates passees sont bloquees — impossible de soumettre pour ces cas | VERIFIED | `setDateMin()` dans reservation.js ligne 37-41 pose `dateInput.min = new Date().toISOString().slice(0, 10)`. `attachDateChangeListener()` lignes 157-166 efface la valeur si lundi detecte par `isMonday()` via T12:00:00Z UTC-safe. `validateField('date')` ligne 108-110 rejette aussi le lundi en submit. |
| 3 | Apres une soumission reussie, un message de confirmation inline apparait sans rechargement de page | VERIFIED | `showSuccess(payload)` lignes 248-266 affiche `#reservation-success` (hidden=false), masque le formulaire (`form.style.display='none'`), masque `#reservation-info`. Le message inclut prenom + date formatee + creneau + nb convives. |
| 4 | En cas d'erreur (reseau ou validation), un message d'erreur specifique et actionnable s'affiche dans le formulaire | VERIFIED | Try/catch/finally lignes 219-242: erreur reseau -> "Impossible de contacter le serveur"; erreur serveur -> extraction de `data.error` depuis JSON, fallback generique. `showGlobalError()` affiche dans `#form-error-global` (role="alert"). |
| 5 | Le formulaire est entierement utilisable sur mobile (mise en page, taille des champs, feedback visuel) | VERIFIED (automatique) / HUMAN pour le rendu visuel | `@media (max-width: 768px) { .reservation-form { grid-template-columns: 1fr; } }` confirme au ligne 1340-1342 de index.html. Rendu visuel a verifier par humain. |

**Score:** 5/5 criteres de succes verifies (automatiquement) + 4 items humains

---

## Verification des Truths Observables

### Plan 02-01 Truths

| # | Truth | Statut | Evidence |
|---|-------|--------|----------|
| 1 | Le formulaire HTML natif est visible dans la section #reservation (pas l'iframe) | VERIFIED | `id="reservation-form"` ligne 2702, dans `<section id="reservation">`. Aucune reference optyms. |
| 2 | Les 7 champs sont presents dans l'ordre : prenom, nom, telephone, email, date, creneau, convives | VERIFIED | Lignes 2715-2780: first_name, last_name, phone, email, date, time_slot, party_size — dans cet ordre. |
| 3 | Les creneaux midi (12h, 12h30, 13h, 13h30) et soir (19h, 19h30, 20h, 20h30, 21h) sont proposes dans un select avec optgroups | VERIFIED | Lignes 2749-2761: `<optgroup label="Service Midi">` (4 options) et `<optgroup label="Service Soir">` (5 options). Valeurs correspondent aux enum API. |
| 4 | Les dates passees sont bloquees (input min = today) | VERIFIED | `setDateMin()` reservation.js ligne 39: `dateInput.min = new Date().toISOString().slice(0, 10)` |
| 5 | Un lundi selectionne est rejete avec message d'erreur et le champ est vide | VERIFIED | `attachDateChangeListener()` lignes 157-166: si `isMonday(dateInput.value)`, `showFieldError('date', ...)` + `dateInput.value = ''`. |
| 6 | La validation au blur marque les champs en erreur uniquement apres interaction | VERIFIED | Pattern touched: `el.addEventListener('blur', ...)` marque `touched[name] = true` avant de valider (lignes 131-138). Submit force aussi tous les touched. |
| 7 | Le telephone accepte 06/07/+33 sans masque de saisie | VERIFIED | `type="tel"` + placeholder "06 12 34 56 78". Regex `FRENCH_PHONE_RE` normalise les espaces avant le test (ligne 95: `value.replace(/\s/g, '')`). |
| 8 | Le champ honeypot est present dans le DOM mais invisible a l'ecran | VERIFIED | `<div class="form-honeypot" aria-hidden="true">` ligne 2705. CSS `.form-honeypot { position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0); }` ligne 1260 — clip technique (pas display:none). |
| 9 | Le formulaire est utilisable en une seule colonne sur mobile (< 768px) | VERIFIED | `@media (max-width: 768px) { .reservation-form { grid-template-columns: 1fr; } }` ligne 1340. Rendu visuel a confirmer humainement. |
| 10 | Le JS est dans un fichier externe js/reservation.js charge avec defer | VERIFIED | `<script src="/js/reservation.js" defer></script>` ligne 3503, avant `</body>`. Le fichier `js/reservation.js` existe (301 lignes). |

### Plan 02-02 Truths

| # | Truth | Statut | Evidence |
|---|-------|--------|----------|
| 1 | Apres une soumission reussie, le formulaire est remplace par un message de confirmation avec prenom, date, heure, nombre de convives et mention SMS | VERIFIED | `showSuccess(payload)` lignes 248-265: successDetails.textContent construit le message personnalise. Ligne 2798: "Un SMS de confirmation vous a ete envoye." `form.style.display='none'` (pas `hidden`) pour contourner la specificite CSS grid. |
| 2 | En cas d'erreur serveur ou reseau, un message d'erreur global s'affiche en haut du formulaire sans perdre les donnees saisies | VERIFIED | `showGlobalError()` affiche dans `#form-error-global`. Le formulaire n'est pas reinitialise en cas d'erreur. `setSubmitting(false)` dans le `finally` reactive toujours le bouton. |
| 3 | L'iframe Go High Level et le script Optyms sont absents de index.html | VERIFIED | `grep -c "optyms" index.html` = 0. |
| 4 | Le placeholder JS inline (Form Submission Example) est supprime de index.html | VERIFIED | `grep "Form Submission" index.html` retourne vide. Aucune reference a `reservationForm` dans le script inline. |
| 5 | Le bouton Nouvelle reservation remet le formulaire a zero et re-affiche le formulaire | VERIFIED | `handleNewReservation()` lignes 273-299: `form.reset()`, effacement du touched state, clearFieldError pour tous, clearGlobalError, `successDiv.hidden = true`, `form.style.display = ''`, `setDateMin()`. |
| 6 | Un spinner s'affiche sur le bouton pendant l'envoi et le bouton est desactive | VERIFIED | `setSubmitting(true)` ligne 77-82: `submitBtn.disabled = isSubmitting`, innerHTML bascule sur `fa-spinner fa-spin` + "Envoi en cours...". |

---

## Verification des Artifacts

### Plan 02-01 Artifacts

| Artifact | Niveau 1: Existe | Niveau 2: Substantiel | Niveau 3: Cable | Statut |
|----------|------------------|-----------------------|-----------------|--------|
| `js/reservation.js` | Oui (301 lignes, > min 80) | Oui: FRENCH_PHONE_RE, isMonday, validateField, setDateMin, showFieldError, showSuccess, touched, blur listeners | Oui: reference dans `<script src="/js/reservation.js" defer>` ligne 3503 | VERIFIED |
| `index.html` | Oui | Oui: form#reservation-form avec 7 champs, honeypot, success div, CSS complet | Oui: formulaire dans section#reservation, script tag cable | VERIFIED |

### Plan 02-02 Artifacts

| Artifact | Niveau 1: Existe | Niveau 2: Substantiel | Niveau 3: Cable | Statut |
|----------|------------------|-----------------------|-----------------|--------|
| `js/reservation.js` (fetch) | Oui | Oui: `fetch(API_URL, ...)` ligne 220, try/catch/finally, showSuccess, showGlobalError, toE164 non present (dans reservations.ts) | Oui: API_URL = '/api/reservations', POST avec JSON body | VERIFIED |
| `index.html` (propre) | Oui | Oui: pas de Form Submission (Example), pas d'optyms, pas de data-aos sur section reservation | Oui: script tag present | VERIFIED |

---

## Verification des Key Links

| From | To | Via | Pattern Verifie | Statut |
|------|-----|-----|-----------------|--------|
| `js/reservation.js` | `index.html #reservation-form` | `document.getElementById('reservation-form')` | Ligne 17: `const form = document.getElementById('reservation-form')` | VERIFIED |
| `index.html` | `js/reservation.js` | `<script src="/js/reservation.js" defer>` | Ligne 3503: exact match | VERIFIED |
| `js/reservation.js` | `/api/reservations` | `fetch()` POST avec JSON body | Ligne 220: `fetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) })` | VERIFIED |
| `js/reservation.js` | `index.html #reservation-success` | `showSuccess()` toggle visibility | Ligne 18: `getElementById('reservation-success')`, ligne 265: `successDiv.hidden = false` | VERIFIED |

---

## Couverture des Requirements

| Requirement | Plan Source | Description | Statut | Evidence |
|-------------|-------------|-------------|--------|----------|
| FORM-01 | 02-01 | Formulaire HTML natif remplace l'iframe GHL | SATISFIED | `id="reservation-form"` ligne 2702, optyms=0 |
| FORM-02 | 02-01 | Champs: prenom, nom, telephone, email, date, creneau, convives | SATISFIED | 7 champs presents lignes 2715-2780 |
| FORM-03 | 02-01 | Creneaux fixes : Midi (12h-13h30) et Soir (19h-21h) | SATISFIED | optgroups lignes 2749-2761, 9 options |
| FORM-04 | 02-01 | Lundi bloque dans le datepicker | SATISFIED | isMonday() + attachDateChangeListener() + validateField('date') |
| FORM-05 | 02-01 | Dates passees bloquees (min = aujourd'hui) | SATISFIED | setDateMin() pose dateInput.min = today |
| FORM-06 | 02-01 | Validation client-side: requis, telephone FR, email, date valide | SATISFIED | validateField() couvre les 7 champs, FRENCH_PHONE_RE |
| FORM-07 | 02-02 | Feedback visuel de succes apres soumission reussie | SATISFIED | showSuccess() + #reservation-success div + message personnalise |
| FORM-08 | 02-02 | Feedback visuel d'erreur en cas de probleme | SATISFIED | showGlobalError() + #form-error-global role="alert" |
| FORM-09 | 02-01 | Champ honeypot cache | SATISFIED | `id="website"` dans .form-honeypot, CSS clip |
| FORM-10 | 02-01 | Formulaire responsive et mobile-friendly | SATISFIED (auto) + HUMAN | @media 768px: 1fr; Rendu visuel a confirmer |
| CODE-01 | 02-01 | JS dans fichier separe (pas inline) | SATISFIED | js/reservation.js separe, charge avec defer |
| MIGR-01 | 02-02 | Iframe GHL supprimee de index.html | SATISFIED | optyms=0, Form Submission Example absent |

**Tous les 12 requirements de la phase 02 sont SATISFAITS automatiquement. Aucun orphelin.**

---

## Anti-Patterns Detectes

| Fichier | Ligne | Pattern | Severite | Impact |
|---------|-------|---------|----------|--------|
| `js/reservation.js` | 110, 119 | `return null` | INFO | Valeurs de retour normales de validateField() — non un stub, context correct |
| `js/reservation.js` | 269 | `window._reservationShowSuccess = showSuccess` | INFO | Exposition window pour integration future — pattern documente dans SUMMARY, non un anti-pattern |

**Aucun anti-pattern bloquant detecte.**

Nota: Les `return null` aux lignes 110 et 119 sont des valeurs de retour normales du switch `validateField()` (default + parties sans erreur), non des stubs.

---

## Decisions Notables (Deviations du Plan)

Ces deviations sont documentees dans 02-02-SUMMARY.md et sont des corrections legitimes:

1. **`form.style.display = 'none'` au lieu de `form.hidden = true`** — CSS grid surchargait l'attribut HTML hidden. Corrige dans commit 66521b6.
2. **`value="9"` pour "Plus de 8"** — Le PLAN sugggerait `value=""` mais le SUMMARY et le code utilisent `value="9"`. Le submit handler verifie `partySizeVal === 9` (ligne 193) et affiche l'erreur "plus de 8 personnes, appelez-nous". Fonctionnellement equivalent — la validation client bloque la soumission.
3. **toE164()** dans `functions/api/reservations.ts` (pas dans reservation.js) — Normalisation telephone avant envoi Twilio. Correct architecturalement.

---

## Items Necessitant Verification Humaine

### 1. Test end-to-end sur staging avec SMS reel

**Test:** Sur la preview URL Cloudflare staging, remplir le formulaire avec des donnees valides (nom, prenom, telephone 06XXXXXXXX, email, date future non-lundi, creneau, 2 personnes) et soumettre.

**Expected:** La page affiche le message de confirmation avec le prenom, la date formatee, le creneau et le nombre de convives. Le client recoit un SMS sur son telephone. Le proprietaire (0651841561) et le CC (0619614643) recoivent un SMS de notification.

**Why human:** Necessite un deploiement staging actif avec les secrets Twilio configures et de vrais telephones pour valider la livraison SMS.

### 2. Apparence visuelle et integration design

**Test:** Ouvrir le site sur desktop et mobile, scroller jusqu'a la section "Reservez votre table".

**Expected:** Le formulaire s'integre au design existant (couleurs vert/blanc du site), les champs sont lisibles, les labels clairs, les optgroups du creneau clairement separes Midi/Soir. Grille 2 colonnes sur desktop, 1 colonne sur mobile.

**Why human:** Le rendu CSS et la coherence visuelle avec le reste du site ne peuvent pas etre evalues statiquement.

### 3. Validation blur interactive

**Test:** Tab a travers tous les champs en les laissant vides, puis remplir progressivement. Entrer "01 23 45 67 89" dans telephone. Taper "abc" dans email.

**Expected:** Les erreurs apparaissent uniquement apres avoir quitte le champ (jamais au chargement). Les erreurs disparaissent des que le champ est corrige (sur change/blur si deja touche).

**Why human:** Le comportement interactif du touched-state ne peut pas etre simule par analyse statique.

### 4. Blocage lundi dans le datepicker

**Test:** Cliquer sur le champ date et selectionner le prochain lundi disponible.

**Expected:** Apres selection, la valeur du champ est effacee et le message "Le restaurant est ferme le lundi. Choisissez un autre jour." s'affiche immediatement sous le champ.

**Why human:** L'interaction native du datepicker depend du navigateur et ne peut pas etre testee statiquement.

---

## Resume

La phase 02 a atteint son objectif principal: **le formulaire natif HTML remplace l'iframe Go High Level**. Tous les checks automatises passent:

- `js/reservation.js` (301 lignes): validation complete, touched-state, Monday blocking, fetch() cable, try/catch/finally, showSuccess().
- `index.html`: 7 champs avec honeypot, optgroups horaires, CSS responsive, success div, zero reference optyms/GHL.
- Key links: form -> JS (script defer), JS -> API (fetch POST), JS -> DOM success div (getElementById).
- 12/12 requirements de la phase SATISFAITS.
- Commits documentes existent tous dans git history (7e5cb03, f6be8d3, 2223f2b, 2060715, 7b26d10, 66521b6).

**Seule limitation:** La livraison SMS effective et le rendu visuel necessitent une verification humaine sur staging.

---

_Verified: 2026-02-26T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
