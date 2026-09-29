# Phase 4 — Catégories : plan d'implémentation

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Objectif :** gestion des catégories à un niveau de hiérarchie, intégrée aux produits.
**Spec :** [docs/superpowers/specs/2026-09-30-phase-4-categories-design.md](../specs/2026-09-30-phase-4-categories-design.md)

## Contraintes globales

Mêmes que la phase 3 : TDD, `requireAdmin` en tête d'action, transactions via `transact()`, audit dans la transaction, CI locale verte avant chaque push.

### Tâche 1 : domaine catégories (pur)

**Fichiers :** `src/features/categories/{types,schemas,tree}.ts` (+ tests)
**Produit :** `Category` (+ `description?`, `version`), `categoryFormSchema`, `buildCategoryTree(categories, counts)`, `categoryOptions(tree)`, `expandCategory(tree, id)`, `isUsable(category, parent)`

- [ ] Tests puis implémentation ; commit `feat(categories): add category domain rules`.

### Tâche 2 : service et dépôt

**Fichiers :** `src/features/categories/{repository,service}.ts` (+ `service.int.test.ts`), `scripts/seed.ts`, `scripts/reset-test-db.ts`
**Produit :** `listCategoryTree()`, `listUsableCategoryOptions()`, `getCategory(id)`, `createCategory(actor, input)`, `updateCategory(actor, id, version, input)`, `setCategoryActive(actor, id, version, active)`, `deleteCategory(actor, id, version)`

- [ ] Tests d'intégration de la spec § 7 ; seed via le service ; commit `feat(categories): add category service with guarded deletion`.

### Tâche 3 : intégration produits

**Fichiers :** `src/features/products/{service,list}.ts`, pages et composants produits

- [ ] Utilisabilité (parent actif), filtre parent → enfants, libellés « Parent › Enfant » ; tests unitaires / intégration mis à jour ; commit `feat(products): use category hierarchy in forms and filters`.

### Tâche 4 : interface catégories

**Fichiers :** `src/app/admin/categories/{page,loading,error}.tsx`, `src/features/categories/{actions.ts,components/*}`

- [ ] Liste hiérarchique, recherche et filtre, dialogue de formulaire, activation, suppression ; commit `feat(categories): add category management screen`.

### Tâche 5 : E2E, documentation, PR

- [ ] `tests/e2e/categories.spec.ts`, README ; commit `test(categories): add category end-to-end journeys` ; PR « Phase 4 — Catégories ».
