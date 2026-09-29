# Phase 3 — Produits : plan d'implémentation

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans). Étapes en cases à cocher.

**Objectif :** module produits complet (liste, CRUD, stock, archivage, suppression protégée) et composants partagés réutilisables.

**Architecture :** `features/products` (schémas → logique pure → dépôt DynamoDB transactionnel → service métier + audit → Server Actions) ; pages Server Components ; composants client limités aux interactions.

**Spec :** [docs/superpowers/specs/2026-09-30-phase-3-products-design.md](../specs/2026-09-30-phase-3-products-design.md)

## Contraintes globales

- TDD sur la logique pure et le dépôt ; E2E sur les parcours.
- Chaque Server Action commence par `requireAdmin("<permission>")` puis valide avec Zod.
- Montants en centimes ; affichage `fr-FR` / EUR.
- Aucune nouvelle dépendance npm (Radix, Sonner, Zod déjà présents).
- Textes d'interface en français, code en anglais.
- Chaque tâche : `pnpm ci:local` vert, commit Conventional Commits, push.

---

### Tâche 1 : utilitaires de format

**Fichiers :** `src/lib/format.ts` (+ `.test.ts`)
**Produit :** `formatPrice(cents: number): string`, `parseEuros(text: string): number | null`, `centsToEuroInput(cents: number): string`, `normalizeText(text: string): string`, `slugify(text: string): string`

- [ ] Tests : `formatPrice(2499)` → `24,99 €` (espace insécable normalisée dans le test) ; `parseEuros` accepte `24,99`, `24.99`, `24`, `1 299,5` → 129950 ; refuse `abc`, `-1`, `1,999`, `""` ; `normalizeText("Chaise Élégante")` → `chaise elegante` ; `slugify("Lampe d'été 60 W !")` → `lampe-d-ete-60-w`.
- [ ] Implémentation, tests verts, commit `feat(core): add price and text formatting helpers`.

### Tâche 2 : domaine produit (logique pure)

**Fichiers :** `src/features/products/{types,schemas,stock,stats,list}.ts` (+ tests)
**Produit :**

- `type Product`, `ProductStatus`, `StockLevel = "IN" | "LOW" | "OUT"`, `stockLevel(p)`
- `productFormSchema` (champs de la spec § 4, `price`/`salePrice` en texte euros → centimes via `parseEuros`), `type ProductFormValues`, `stockAdjustmentSchema`, `STOCK_REASONS`, `productListQuerySchema` (défauts § 5)
- `type StatsDelta = { totalProducts; outOfStock; lowStock; categories: Record<string, number> }`, `statsDelta(before: Product | null, after: Product | null): StatsDelta`
- `filterSortPaginate(items: ProductListItem[], query: ProductListQuery): { items; total; page; pageCount }`

- [ ] Tests schémas : prix promo ≥ prix refusé ; SKU mis en majuscules ; slug invalide refusé ; stock négatif / décimal refusé.
- [ ] Tests `statsDelta` : création active en stock (+1 total), création en rupture (+1 total, +1 rupture), archivage (−1 partout), restauration, passage stock faible → rupture, changement de catégorie (−1 / +1), suppression d'un archivé (0).
- [ ] Tests liste : recherche sans accents sur nom et SKU ; filtres catégorie / statut `current` / stock ; 8 tris ; page hors bornes ramenée à la dernière ; paramètres invalides → défauts.
- [ ] Implémentation, commit `feat(products): add product domain rules`.

### Tâche 3 : catégories de départ, permission et seed de démo

**Fichiers :** `src/features/categories/{types,repository}.ts` (+ `.int.test.ts`), `src/lib/auth/permissions.ts`, `scripts/seed.ts`, `scripts/lib/demo-products.ts`
**Produit :** `listActiveCategories(): Promise<Category[]>`, `findCategory(id)`, `SEED_CATEGORIES`, permission `products:delete`

- [ ] Test permissions : `products:delete` accordé à SUPER_ADMIN seulement.
- [ ] Test intégration : catégories créées sont listées triées par `sortOrder`, inactives exclues.
- [ ] Seed idempotent des 6 catégories (+ `Uniques CATEGORY_SLUG#…`, `Stats CATEGORY#…`) ; `--demo` refusé avec `--aws`, crée ~40 produits via le service (tâche 4) — l'appel est branché en tâche 4.
- [ ] Commit `feat(categories): add seeded categories and products:delete permission`.

### Tâche 4 : dépôt et service produits

**Fichiers :** `src/features/products/{repository,service}.ts` (+ `service.int.test.ts`)
**Produit :**

- `createProduct(actor, values)`, `updateProduct(actor, id, expectedVersion, values)`, `adjustStock(actor, id, expectedVersion, adjustment)`, `archiveProduct(actor, id, expectedVersion)`, `restoreProduct(actor, id, expectedVersion)`, `deleteProduct(actor, id)`
- `getProduct(id)`, `listProducts(query)` (Query `byStatus` par statut demandé, projection liste, puis `filterSortPaginate`), `getProductActivity(id, limit)`, `getProductUsage(id): { carts: number; wishlists: number }`
- Erreurs `AppError` : `PRODUCT_NOT_FOUND`, `SKU_TAKEN`, `SLUG_TAKEN`, `CATEGORY_INVALID`, `VERSION_CONFLICT`, `NEGATIVE_STOCK`, `PRODUCT_IN_USE`
- `actor = Session`

- [ ] Tests intégration (spec § 9) dont vérification des compteurs `Stats` après la séquence créer → rupture → changer de catégorie → archiver → restaurer → supprimer.
- [ ] Transactions : produit + `Uniques` + `Stats` (ADD issus de `statsDelta`) + audit dans la même `TransactWriteItems` (≤ 100 opérations).
- [ ] Brancher `--demo` du seed. Commit `feat(products): add transactional product repository and service`.

### Tâche 5 : primitives UI et composants partagés

**Fichiers :** `src/components/ui/{input,textarea,select,label,badge,dialog,alert-dialog,sonner}.tsx`, `src/components/data-table/{data-table,filter-bar,search-input,pagination}.tsx`, `src/components/feedback/{confirm-dialog,error-state,status-badge}.tsx`, `src/app/layout.tsx` (Toaster)
**Produit :** composants accessibles (labels, `aria-invalid`, focus visible), `DataTable` générique avec rendu cartes sous `md`, `ConfirmDialog` avec saisie de confirmation optionnelle, `useUrlFilters()` (lecture / écriture des `searchParams` via `router.replace`, recherche avec délai 300 ms).

- [ ] Tests unitaires Testing Library : `ConfirmDialog` désactive la confirmation tant que le texte attendu n'est pas saisi ; `Pagination` affiche « 1–20 sur 45 » et désactive Précédent en page 1.
- [ ] Commit `feat(ui): add form primitives, data table and dialogs`.

### Tâche 6 : liste des produits

**Fichiers :** `src/app/admin/products/{page,loading,error}.tsx`, `src/features/products/components/{product-list,product-filters,product-row-actions,stock-badge,product-status-badge}.tsx`

- [ ] Onglets statut, filtres, table / cartes, pagination, état vide, aucun résultat, erreur, bouton « Ajouter un produit » selon permission.
- [ ] Commit `feat(products): add filterable product list`.

### Tâche 7 : formulaire, création et modification

**Fichiers :** `src/features/products/actions.ts`, `src/features/products/components/product-form.tsx`, `src/app/admin/products/new/page.tsx`, `src/app/admin/products/[productId]/edit/page.tsx`

- [ ] Actions `createProductAction`, `updateProductAction` (état de formulaire avec erreurs par champ, `redirect` vers la fiche avec toast via paramètre `?saved=1`).
- [ ] Slug automatique, avertissement `beforeunload` si formulaire modifié.
- [ ] Commit `feat(products): add product create and edit forms`.

### Tâche 8 : fiche, stock, archivage, suppression

**Fichiers :** `src/app/admin/products/[productId]/page.tsx`, `src/features/products/components/{stock-dialog,archive-dialog,delete-dialog,product-activity}.tsx`, actions correspondantes

- [ ] Fiche complète (spec § 7), dialogues, toasts, `revalidatePath` après chaque action.
- [ ] Commit `feat(products): add product detail with stock and lifecycle actions`.

### Tâche 9 : E2E, captures, documentation

**Fichiers :** `tests/e2e/products.spec.ts`, `scripts/reset-test-db.ts` (catégories de test), `README.md`, `ROADMAP.md`

- [ ] Parcours E2E de la spec § 9 ; vérification visuelle (captures desktop / mobile).
- [ ] Seed des catégories en production (`pnpm db:seed -- --aws`) après merge.
- [ ] Commit `test(products): add product end-to-end journeys` → PR « Phase 3 — Produits ».
