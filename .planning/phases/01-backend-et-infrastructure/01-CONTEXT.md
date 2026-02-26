# Phase 1: Backend et Infrastructure - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Le backend peut recevoir une reservation via POST /api/reservations, la stocker dans D1, et envoyer deux SMS Twilio (confirmation client + notification proprietaire) — verifiable via curl sans aucun frontend. Restaurant situe a Ales, France metropolitaine.

</domain>

<decisions>
## Implementation Decisions

### Contenu des SMS
- Numero du restaurant inclus dans le SMS client pour permettre l'annulation par telephone
- SMS en francais

### Comportement de validation
- Formats telephone : numeros francais metropolitains uniquement (06, 07, +33)
- Jour bloque : lundi seulement (pas de jours feries ni fermetures exceptionnelles)
- Dates : pas de limite future, minimum = aujourd'hui
- Creneaux : Midi (12h, 12h30, 13h, 13h30) et Soir (19h, 19h30, 20h, 20h30, 21h)

### Gestion des erreurs Twilio
- Reservation sauvegardee dans D1 meme si l'envoi SMS echoue — pas de resa perdue
- L'API retourne un succes avec warning si le SMS echoue

### Claude's Discretion
- Ton des SMS (formel/decontracte) — adapte a un restaurant
- Encodage SMS : choix GSM-7 (sans accents) vs UCS-2 (avec accents) selon rapport lisibilite/cout
- Infos incluses dans le SMS proprietaire (toutes ou selection)
- Retry automatique Twilio en cas d'echec
- Gestion SMS partiel (un reussit, l'autre echoue)
- Logging des echecs SMS (console.error Workers vs colonne D1)
- Limite min/max du nombre de convives
- Format de la reponse API succes (ID seul vs details complets)
- Structure des erreurs de validation (par champ vs message global)
- Format de l'identifiant de reservation (nanoid, UUID, auto-increment)
- Langue des messages d'erreur API (francais vs anglais)

</decisions>

<specifics>
## Specific Ideas

- Le client doit pouvoir lire dans le SMS comment annuler (numero de telephone du restaurant)
- Restaurant a Ales (France metropolitaine) — pas d'outre-mer, uniquement numeros 06/07/+33

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-backend-et-infrastructure*
*Context gathered: 2026-02-26*
