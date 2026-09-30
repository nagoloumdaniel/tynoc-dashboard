# Phase 7c — Notifications : plan

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Spec :** [docs/superpowers/specs/2026-09-30-phase-7-dashboard-design.md](../specs/2026-09-30-phase-7-dashboard-design.md) (partie 7c)

Contraintes : TDD, `requireAdmin`, CI locale avant chaque push.

Décisions :

- Table `Notifications` : clé `id`, index `byFeed` (`feed = "NOTIF"`, `createdAt`), TTL `expiresAt` (30 jours). Champs : `type`, `title`, `body`, `href`, `severity` (`info` | `important`), `actorId?`.
- Écriture **dans la transaction** de l'action qui la provoque (pas de notification pour une action annulée), sauf le blocage anti force brute (écriture simple).
- Événements : stock qui se dégrade (en stock → faible → rupture ; `important` pour la rupture) ; suppression définitive de produit, anonymisation, changement de rôle, création d'administrateur (`actorId` renseigné : l'auteur ne reçoit pas sa propre action) ; email bloqué après 5 échecs (`important`, email masqué).
- Lecture : `GET /api/notifications?since=<ISO>` (401 JSON sans session) → nouvelles notifications + nombre de non-lues (depuis `Users.notificationsReadAt`, plafonné à 99). « Tout marquer comme lu » : Server Action.
- Interface : cloche dans la barre du haut, badge, liste des 20 dernières ; interrogation toutes les 15 s et au retour sur l'onglet ; toast pour chaque nouvelle notification `important` (jamais au premier chargement).

### Tâche 1 : règles (pur)

- [x] `src/features/notifications/events.ts` (construction des notifications, transitions de stock) + tests ; commit `feat(notifications): add notification rules`.

### Tâche 2 : données et écriture

- [x] Table + index + TTL, dépôt (opération de transaction, lecture, non-lues, lu), branchement produits / utilisateurs / anti force brute + tests d'intégration ; commit `feat(notifications): record notifications`.

### Tâche 3 : lecture

- [x] `GET /api/notifications`, action « Tout marquer comme lu » + tests ; commit `feat(notifications): add notifications feed`.

### Tâche 4 : interface

- [ ] Cloche, liste, badge, interrogation, toasts ; commit `feat(notifications): add notification bell`.

### Tâche 5 : production, E2E, documentation, PR

- [ ] Table sur AWS (`pnpm db:create -- --aws`), droits du rôle, `tests/e2e/notifications.spec.ts`, README ; PR « Phase 7c — Notifications ».
