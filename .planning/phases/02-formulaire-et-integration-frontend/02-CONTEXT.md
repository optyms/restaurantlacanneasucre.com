# Phase 2: Formulaire et Integration Frontend - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Les clients peuvent remplir et soumettre un formulaire de reservation directement sur le site — sans iframe, sans Go High Level. Le formulaire HTML natif remplace l'iframe Optyms/GHL dans la section #reservation existante, se branche sur le backend POST /api/reservations (Phase 1), et offre validation client-side + feedback inline.

</domain>

<decisions>
## Implementation Decisions

### Ordre des champs
- Identite d'abord (prenom, nom, telephone, email), puis reservation (date, heure, convives)
- Logique naturelle : on se presente, puis on dit quand on vient

### Confirmation de succes
- Message inline remplacant le formulaire apres soumission reussie
- Affiche : prenom du client, date, heure, nombre de convives
- Mentionne l'envoi du SMS de confirmation
- Bouton "Nouvelle reservation" pour revenir au formulaire vide

### Affichage des erreurs
- Erreurs inline par champ : bordure rouge + message sous le champ concerne
- Erreurs globales (reseau, serveur) : message en haut du formulaire
- Les champs ne se marquent en erreur qu'apres interaction (pas au chargement initial)

### Validation
- Validation au blur (quand l'utilisateur quitte un champ) + re-validation complete au submit
- Telephone : input libre avec placeholder "06 12 34 56 78", validation accepte formats 06/07/+33
- Pas de masque de saisie (eviter la frustration sur mobile)

### Elements conserves
- Titre "Reservez votre table maintenant" et sous-titre conserves tels quels
- Infos contact et horaires sous le formulaire conservees
- Bouton flottant mobile "Reserver" conserve (scrolle vers #reservation)

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

</decisions>

<specifics>
## Specific Ideas

- Le formulaire commente dans index.html (lignes 2634-2673) fournit une base de depart : grille 3 colonnes (date, heure, convives), bouton "Confirmer ma reservation" avec icone fa-calendar-check
- Le CSS existant (.reservation-form, .form-group) definit deja un style coherent : fond blanc translucide, border-radius, focus glow blanc — a reutiliser et etendre pour les nouveaux champs
- La section reservation a un conteneur centre max-width 700px avec backdrop-filter blur — le formulaire doit s'integrer dans ce cadre
- Le JS existant reservation-notification peut servir de base pour le feedback

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-formulaire-et-integration-frontend*
*Context gathered: 2026-02-26*
