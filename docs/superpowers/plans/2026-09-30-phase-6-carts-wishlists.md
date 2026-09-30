# Phase 6 — Paniers et wishlists : plan d'implémentation

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Spec :** [docs/superpowers/specs/2026-09-30-phase-6-carts-wishlists-design.md](../specs/2026-09-30-phase-6-carts-wishlists-design.md)

Contraintes : celles des phases précédentes (TDD, `requireAdmin`, transactions + audit, CI locale avant push).

### Tâche 1 : index `byFeed` et migration des tables existantes

- [ ] `TABLES.Carts` / `TABLES.Wishlists` + `missingIndexes()` (pur, testé) ; `ensureTables` crée les index manquants ; commit `feat(db): add feed indexes to carts and wishlists`.

### Tâche 2 : domaine (pur)

- [ ] `src/features/carts/{types,summary,schemas}.ts` : disponibilité, valeur, abandon, résumés, requêtes de liste, filtres / tris / pagination ; commit `feat(carts): add cart and wishlist domain rules`.

### Tâche 3 : dépôt et service

- [ ] Listes via `byFeed`, détails, retrait, vidage, compteurs, audit ; tests d'intégration ; commit `feat(carts): add cart and wishlist service`.

### Tâche 4 : interface

- [ ] Pages paniers et wishlists (liste + détail), actions, liens depuis les fiches utilisateur et produit ; commit `feat(carts): add cart and wishlist screens`.

### Tâche 5 : démo, E2E, documentation

- [ ] Seed de démonstration, `tests/e2e/carts.spec.ts`, README ; commit `test(carts): add cart and wishlist end-to-end journeys` ; PR « Phase 6 — Paniers et wishlists ».
