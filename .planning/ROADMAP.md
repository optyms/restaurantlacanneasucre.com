# Roadmap: La Canne a Sucre — Systeme de Reservation Custom

## Overview

Remplacer l'iframe Go High Level par un systeme de reservation en propre : backend Cloudflare Workers + D1, formulaire HTML natif, SMS Twilio directs. Trois phases : construire et tester le backend, brancher le frontend, puis couper vers la production et decommissionner GHL.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Backend et Infrastructure** - Worker, D1, Twilio, staging — tout tester sans frontend
- [ ] **Phase 2: Formulaire et Integration Frontend** - Formulaire HTML natif, validation, UX, suppression iframe GHL
- [ ] **Phase 3: Mise en Production et Decommissionnement GHL** - Validation end-to-end, bascule prod, arret GHL

## Phase Details

### Phase 1: Backend et Infrastructure
**Goal**: Le backend peut recevoir une reservation, la stocker dans D1 et envoyer deux SMS Twilio — verifiable via curl sans aucun frontend
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, SMS-01, SMS-02, SMS-03
**Success Criteria** (what must be TRUE):
  1. Un POST curl vers /api/reservations avec des donnees valides retourne HTTP 201 et la reservation apparait dans D1
  2. Le client recoit un SMS de confirmation en francais dans les secondes qui suivent la soumission
  3. Le proprietaire recoit un SMS de notification avec tous les details de la reservation
  4. Un POST avec un lundi ou une date passee retourne HTTP 400 (validation server-side bloque bien ces cas)
  5. Les environnements staging et production utilisent des bases D1 separees — une reservation de test ne peut pas contaminer la prod
**Plans**: 2 plans

Plans:
- [~] 01-01-PLAN.md — Provisionnement D1 et configuration Wrangler (bases prod + staging, wrangler.jsonc, TypeScript, _routes.json, secrets Twilio) — Tasks 1-2 done, Task 3 checkpoint:human-action
- [ ] 01-02-PLAN.md — Pages Function POST /api/reservations (validation Zod, D1 insert, Twilio SMS x2, tests curl)

### Phase 2: Formulaire et Integration Frontend
**Goal**: Les clients peuvent remplir et soumettre le formulaire de reservation directement sur le site — sans iframe, sans Go High Level
**Depends on**: Phase 1
**Requirements**: FORM-01, FORM-02, FORM-03, FORM-04, FORM-05, FORM-06, FORM-07, FORM-08, FORM-09, FORM-10, CODE-01, MIGR-01
**Success Criteria** (what must be TRUE):
  1. L'iframe Go High Level n'est plus visible dans la section reservation — remplacee par un formulaire HTML natif aux couleurs du site
  2. Le lundi est inaccessible dans le datepicker et les dates passees sont bloquees — impossible de soumettre pour ces cas
  3. Apres une soumission reussie, un message de confirmation inline apparait sans rechargement de page
  4. En cas d'erreur (reseau ou validation), un message d'erreur specifique et actionnable s'affiche dans le formulaire
  5. Le formulaire est entierement utilisable sur mobile (mise en page, taille des champs, feedback visuel)
**Plans**: TBD

Plans:
- [ ] 02-01: Formulaire HTML natif (champs, datepicker, validation client-side, honeypot, responsive)
- [ ] 02-02: Branchement fetch() vers /api/reservations, feedback succes/erreur, suppression iframe GHL, JS externalise

### Phase 3: Mise en Production et Decommissionnement GHL
**Goal**: Le nouveau systeme est en production, valide sur de vraies reservations, et Go High Level est desactive sans perte de donnees ni de numero de telephone
**Depends on**: Phase 2
**Requirements**: (none — phase operationnelle; tous les requirements v1 sont couverts par les phases 1 et 2)
**Success Criteria** (what must be TRUE):
  1. Une reservation complete faite sur staging arrive bien dans D1 staging et declenche les deux SMS sur de vrais telephones
  2. Apres merge sur main, une reservation de verification en production est enregistree dans D1 prod et les deux SMS arrivent
  3. La periode de run parallele (GHL + nouveau systeme actifs simultanement) dure au moins 7 jours sans incident
  4. Le numero Twilio est confirme en propre sur le compte direct (pas sous-compte GHL) avant annulation de GHL
  5. L'abonnement GHL est annule et l'iframe GHL est absente de index.html en production
**Plans**: TBD

Plans:
- [ ] 03-01: Validation staging end-to-end + checklist de mise en production (sender type, encodage SMS, isolation D1, secrets)
- [ ] 03-02: Merge prod, run parallele, audit numero Twilio, annulation GHL

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Backend et Infrastructure | 0/2 | In progress (01-01 Tasks 1-2 done, Task 3 checkpoint) | - |
| 2. Formulaire et Integration Frontend | 0/2 | Not started | - |
| 3. Mise en Production et Decommissionnement GHL | 0/2 | Not started | - |
