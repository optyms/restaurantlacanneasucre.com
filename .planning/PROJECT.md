# Refonte Reservation — La Canne a Sucre

## What This Is

Refonte du systeme de reservation du site web du restaurant La Canne a Sucre (Ales, France). L'objectif est de remplacer Go High Level (calendrier + confirmations) et n8n (notifications) par un systeme custom utilisant Cloudflare Workers, D1, et Twilio pour les SMS — tout en nettoyant et professionnalisant la base de code existante.

## Core Value

Les clients peuvent reserver en ligne et recevoir une confirmation SMS, tandis que le proprietaire est notifie instantanement de chaque nouvelle reservation — sans dependance a Go High Level ni n8n.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Site vitrine complet (hero, a propos, galerie, menu, equipe, FAQ, contact, footer) — existant
- ✓ Design responsive mobile-first — existant
- ✓ Galerie avec carrousel et modal — existant
- ✓ Menu avec interface a onglets — existant
- ✓ FAQ en accordeon — existant
- ✓ Integration Google Maps — existant
- ✓ Widget avis clients (ReputationHub) — existant
- ✓ Page "Autres prestations" — existant

### Active

<!-- Current scope. Building toward these. -->

- [ ] Calendrier de reservation custom en remplacement de Go High Level
- [ ] Creneaux horaires fixes (midi 12h-14h30, soir 19h-22h30)
- [ ] Jours de fermeture bloques (lundi)
- [ ] Formulaire : nom, telephone, email, date, creneau, nombre de convives
- [ ] Backend Cloudflare Workers + D1 pour stocker les reservations
- [ ] SMS de confirmation au client via Twilio
- [ ] SMS de notification au proprietaire via Twilio (details complets)
- [ ] Branche staging pour tester avant la prod
- [ ] Nettoyage et restructuration du code existant

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Limite de capacite par creneau — pas necessaire pour le MVP, le restaurant gere manuellement
- Application mobile de gestion des reservations — projet Base44 separe
- Systeme d'authentification / espace client — pas de besoin identifie
- Paiement en ligne — le restaurant ne le requiert pas
- Notifications push — SMS suffisent
- Gestion multi-restaurant — un seul restaurant

## Context

- Site existant heberge sur Cloudflare Pages, deploye automatiquement depuis la branche `main` sur GitHub
- Le code est un monolithe HTML (~3400 lignes) avec CSS et JS inline dans `index.html`
- Go High Level (compte "Optyms") gere actuellement le calendrier + contacts + SMS de confirmation client
- n8n connecte Go High Level a Twilio pour notifier le proprietaire par SMS a chaque reservation
- Twilio est deja en place et fonctionnel (compte existant)
- Le restaurant est ouvert du mardi au dimanche, services midi (12h-14h30) et soir (19h-22h30)
- Ferme le lundi
- Adresse : 6 rue du 14 Juillet, 30100 Ales, France
- Donnees collectees lors d'une reservation : nom, prenom, telephone, email, date, creneau horaire, nombre de convives

## Constraints

- **Hebergement** : Cloudflare Pages (statique) + Cloudflare Workers/D1 (backend serverless) — rester dans l'ecosysteme Cloudflare, free tier
- **SMS** : Twilio (compte existant) — cout par SMS
- **Deploiement** : GitHub → Cloudflare Pages auto-deploy — branche staging pour les tests, main pour la prod
- **Budget** : Minimiser les couts — pas de nouveaux services payants
- **Simplicite** : Site de restaurant, pas une appli SaaS — garder les choses simples et maintenables

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cloudflare Workers + D1 comme backend | Deja sur Cloudflare, free tier genereux, zero cout supplementaire | — Pending |
| SMS via Twilio direct (pas via n8n) | Un fetch() suffit, elimine n8n des la Phase 1, moins de dependances | — Pending |
| Pas de limite de capacite par creneau | Simplifier le MVP, le restaurant gere ca manuellement | — Pending |
| Branche staging pour les tests | Cloudflare Pages genere des preview URLs automatiquement pour les branches non-main | — Pending |

---
*Last updated: 2026-02-26 after initialization*
