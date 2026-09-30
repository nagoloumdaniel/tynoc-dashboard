# Phase 7a — Tableau de bord, comparaison, activité, mode sombre : plan

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Spec :** [docs/superpowers/specs/2026-09-30-phase-7-dashboard-design.md](../specs/2026-09-30-phase-7-dashboard-design.md) (partie 7a)

Contraintes : TDD, `requireAdmin`, CI locale avant chaque push ; Recharts ajouté via `pnpm add --lockfile-only` puis réinstallation propre.

### Tâche 1 : domaine (pur)

- [ ] `src/features/dashboard/{period,comparison,charts,cards}.ts`, `src/features/activity/{cursor,schemas}.ts` + tests ; commit `feat(dashboard): add period, comparison and chart data rules`.

### Tâche 2 : données

- [ ] `src/features/dashboard/service.ts` (compteurs, indicateurs de mouvement, instantanés, widgets), `src/features/activity/service.ts` (journal filtré, paginé) + tests d'intégration ; commit `feat(dashboard): add dashboard and activity data`.

### Tâche 3 : instantané quotidien

- [ ] `src/app/api/cron/snapshot/route.ts`, `vercel.json`, variable `CRON_SECRET` ; commit `feat(dashboard): add daily stats snapshot cron`.

### Tâche 4 : tableau de bord

- [x] Page `/admin` : sélecteur de période, cartes, widgets en `Suspense` avec limite d'erreur, graphiques Recharts dynamiques ; commit `feat(dashboard): add dashboard page`.

### Tâche 5 : journal d'activité

- [ ] Page `/admin/activity` : filtres, « Voir plus », détails dépliables ; commit `feat(activity): add activity log page`.

### Tâche 6 : mode sombre

- [ ] `next-themes`, choix dans le menu du compte, vérification des contrastes ; commit `feat(ui): add dark mode`.

### Tâche 7 : E2E, documentation, PR

- [ ] `tests/e2e/dashboard.spec.ts`, README ; PR « Phase 7a — Tableau de bord ».
