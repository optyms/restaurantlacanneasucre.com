# Requirements: Refonte Reservation — La Canne a Sucre

**Defined:** 2026-02-26
**Core Value:** Les clients peuvent reserver en ligne et recevoir une confirmation SMS, tandis que le proprietaire est notifie instantanement — sans Go High Level ni n8n.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Infrastructure

- [x] **INFRA-01**: Branche staging creee sur GitHub avec preview URL Cloudflare Pages fonctionnel
- [x] **INFRA-02**: Base D1 de production creee et bindee au Worker
- [x] **INFRA-03**: Base D1 de staging creee et bindee a l'environnement preview
- [x] **INFRA-04**: Configuration Wrangler (wrangler.jsonc) avec bindings D1 et routes
- [x] **INFRA-05**: Secrets Twilio (Account SID, Auth Token, sender number, owner number) configures via wrangler secret

### Formulaire de Reservation

- [x] **FORM-01**: Formulaire HTML natif remplace l'iframe Go High Level (Optyms) dans la section reservation
- [x] **FORM-02**: Champs du formulaire : prenom, nom, telephone, email, date, creneau horaire, nombre de convives
- [x] **FORM-03**: Creneaux horaires fixes proposes : service Midi (12h, 12h30, 13h, 13h30) et Soir (19h, 19h30, 20h, 20h30, 21h)
- [x] **FORM-04**: Le lundi est bloque dans le datepicker (jour de fermeture)
- [x] **FORM-05**: Les dates passees sont bloquees dans le datepicker (min = aujourd'hui)
- [x] **FORM-06**: Validation client-side : champs requis, format telephone francais (+33 / 06-07), format email, date valide
- [ ] **FORM-07**: Feedback visuel de succes apres soumission reussie (message inline)
- [ ] **FORM-08**: Feedback visuel d'erreur en cas de probleme (erreur reseau, validation serveur)
- [x] **FORM-09**: Champ honeypot cache pour protection anti-spam
- [x] **FORM-10**: Formulaire responsive et mobile-friendly (coherent avec le design existant du site)

### Backend & API

- [x] **BACK-01**: Pages Function (ou Worker) expose un endpoint POST /api/reservations
- [x] **BACK-02**: Validation server-side des donnees (miroir de la validation client-side + rejet du lundi + rejet honeypot)
- [x] **BACK-03**: Schema D1 : table reservations (id, first_name, last_name, phone, email, date, time_slot, party_size, created_at)
- [x] **BACK-04**: Insertion de la reservation dans D1 apres validation
- [x] **BACK-05**: Gestion des erreurs avec codes HTTP et messages exploitables par le frontend

### SMS

- [x] **SMS-01**: SMS de confirmation envoye au client via Twilio apres reservation (en francais, avec nom du restaurant, date, service midi/soir, nb convives, tel pour annuler)
- [x] **SMS-02**: SMS de notification envoye au proprietaire via Twilio (details complets : nom, tel, email, date, service, nb convives)
- [x] **SMS-03**: Templates SMS en francais, contenu sous 160 caracteres par segment (eviter les caracteres accentues pour rester en GSM-7)

### Code & Migration

- [x] **CODE-01**: Nouveau JavaScript du formulaire de reservation dans un fichier JS separe (pas inline dans index.html)
- [ ] **MIGR-01**: Iframe Go High Level (Optyms) supprimee de index.html et remplacee par le nouveau formulaire

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications

- **NOTF-01**: SMS de rappel automatique 24h avant la reservation (necessite Cron Trigger Cloudflare)
- **NOTF-02**: Email de confirmation en complement du SMS

### Administration

- **ADMIN-01**: Endpoint GET /api/reservations pour lister les reservations a venir (JSON)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Limite de capacite par creneau | Le proprietaire gere manuellement ; ajouter si overbooking devient un probleme |
| Flux d'annulation en ligne | Trop complexe pour le MVP ; le client appelle pour annuler |
| Compte / login client | Aucun besoin identifie ; reservations sans etat |
| Dashboard admin web | Projet Base44 separe |
| Paiement en ligne / depot | Non requis par le restaurant |
| CAPTCHA (reCAPTCHA) | Cloudflare fournit deja la protection anti-bot ; honeypot suffit |
| Disponibilite en temps reel | Le proprietaire gere la capacite manuellement |
| SMS bidirectionnel | Complexite significative pour un benefice marginal a cette echelle |
| Notifications push | SMS suffisent |
| Multi-restaurant | Un seul restaurant |
| Periode parallele GHL | Le proprietaire prefere couper directement |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Complete |
| FORM-01 | Phase 2 | Complete |
| FORM-02 | Phase 2 | Complete |
| FORM-03 | Phase 2 | Complete |
| FORM-04 | Phase 2 | Complete |
| FORM-05 | Phase 2 | Complete |
| FORM-06 | Phase 2 | Complete |
| FORM-07 | Phase 2 | Pending |
| FORM-08 | Phase 2 | Pending |
| FORM-09 | Phase 2 | Complete |
| FORM-10 | Phase 2 | Complete |
| BACK-01 | Phase 1 | Complete |
| BACK-02 | Phase 1 | Complete |
| BACK-03 | Phase 1 | Complete |
| BACK-04 | Phase 1 | Complete |
| BACK-05 | Phase 1 | Complete |
| SMS-01 | Phase 1 | Complete |
| SMS-02 | Phase 1 | Complete |
| SMS-03 | Phase 1 | Complete |
| CODE-01 | Phase 2 | Complete |
| MIGR-01 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0

**Note:** Phase 3 (Production Cutover) is an operational phase with no v1 requirements assigned. Its success criteria derive from the research pitfall documentation (GHL migration risk, SMS delivery validation). All 25 v1 requirements are covered by Phases 1 and 2.

---
*Requirements defined: 2026-02-26*
*Last updated: 2026-02-26 — traceability updated after roadmap creation*
