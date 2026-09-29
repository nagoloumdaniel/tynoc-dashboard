# Phase 3 — Produits : design

**Date :** 2026-09-30
**Statut :** validé en discussion, en relecture
**Roadmap :** [ROADMAP.md](../../../ROADMAP.md) § 9 et § 20 (Phase 3)

## 1. Objectif

Gérer le catalogue depuis `/admin/products` : lister, rechercher, filtrer, trier, créer, consulter, modifier, ajuster le stock, archiver, restaurer et supprimer, avec validations, confirmations, audit et compteurs du tableau de bord à jour. Le module sert de modèle (composants partagés, structure `features/*`) aux phases 4 à 6.

## 2. Décisions

| Sujet                | Décision                                                                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catégories           | 6 catégories de départ créées par `pnpm db:seed` (local et AWS) ; écran de gestion en phase 4                                                                    |
| Taille visée         | quelques milliers de produits ; au-delà de ~5 000, prévoir un moteur de recherche (documenté)                                                                    |
| Liste                | lecture par statut via l'index `byStatus` (`Query`, jamais `Scan`), projection des seuls champs de liste, puis filtre, tri et pagination en mémoire côté serveur |
| Cache inter-requêtes | aucun pour l'instant (`use cache` exige Cache Components en Next 16) ; déduplication par requête avec `React.cache`                                              |
| Images               | hors périmètre (phase 7) ; `imageKeys: []`, vignette neutre                                                                                                      |
| Montants             | centimes entiers ; saisie en euros (`24,99`), affichage `Intl.NumberFormat("fr-FR", { currency: "EUR" })`                                                        |
| État d'URL           | paramètres natifs (`searchParams`) mis à jour par `router.replace`, sans dépendance                                                                              |
| Toasts               | Sonner (déjà installé)                                                                                                                                           |

## 3. Données

### 3.1 Produit (`Products`)

```ts
type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

type Product = {
  id: string; // prd_<uuid>
  name: string;
  nameNormalized: string; // minuscules, sans accents (index byStatus + recherche)
  slug: string;
  sku: string; // majuscules
  description?: string;
  categoryId: string;
  priceInCents: number;
  salePriceInCents?: number;
  stock: number;
  lowStockThreshold: number; // défaut 5
  imageKeys: string[]; // vide jusqu'à la phase 7
  status: ProductStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

Niveau de stock dérivé : `OUT` si `stock = 0`, `LOW` si `stock ≤ lowStockThreshold`, sinon `IN`.

### 3.2 Catégorie (`Categories`, lecture seule en phase 3)

`{ id: "cat_<slug>", name, slug, sortOrder, isActive, createdAt, updatedAt }` (sans `parentId`). Seed : Mobilier, Luminaires, Décoration, Textile, Cuisine, Rangement.

### 3.3 Unicité (`Uniques`)

`SKU#<sku>` et `PRODUCT_SLUG#<slug>` → `{ productId }`, écrits dans la même transaction que le produit. Un changement de SKU ou de slug supprime l'ancienne réservation et crée la nouvelle dans la transaction de mise à jour.

### 3.4 Compteurs (`Stats`)

- `GLOBAL` : `totalProducts`, `outOfStock`, `lowStock`.
- `CATEGORY#<id>` : `productCount`.

Seuls les produits non archivés sont comptés. `statsDelta(before, after)` (fonction pure) calcule les incréments de chaque compteur pour toute transition (création, modification, changement de catégorie, stock, archivage, restauration, suppression) ; les `ADD` correspondants sont inclus dans la transaction.

## 4. Règles métier

- **Validation** (schéma Zod partagé client/serveur) : nom 2–120 ; slug `^[a-z0-9]+(-[a-z0-9]+)*$` 2–120 ; SKU `^[A-Z0-9-]{2,50}$` après mise en majuscules ; description ≤ 5 000 ; catégorie existante et active (vérifiée côté serveur) ; prix entier ≥ 0 ; prix promo < prix ; stock entier 0–1 000 000 ; seuil 0–100 000 ; statut `DRAFT | ACTIVE` à la création.
- **Unicité** : SKU → `SKU_TAKEN` « Ce SKU est déjà utilisé. » ; slug → `SLUG_TAKEN` « Ce slug est déjà utilisé. ».
- **Concurrence** : toute mise à jour envoie `version` ; condition `version = :expected` ; échec → `VERSION_CONFLICT` « Ce produit a été modifié par quelqu'un d'autre. Rechargez la page. ».
- **Stock** : mode `DELTA` (±n) ou `SET` (valeur) ; raison `RESTOCK | INVENTORY | DAMAGE | CORRECTION | OTHER` (+ note ≤ 200) ; condition `version` + résultat ≥ 0 → sinon `NEGATIVE_STOCK` « Le stock ne peut pas être négatif. ».
- **Archivage** : `status = ARCHIVED`, `archivedAt` ; **restauration** vers `DRAFT`.
- **Suppression définitive** : permission `products:delete` (SUPER_ADMIN seulement) ; refusée (`PRODUCT_IN_USE`) si le produit apparaît dans `Carts` ou `Wishlists` (index `byProduct`) ; supprime aussi ses réservations `Uniques`.
- **Audit** : `CREATE`, `UPDATE` (champs modifiés en `changes`), `STOCK_ADJUST` (`from`, `to`, raison), `ARCHIVE`, `RESTORE`, `DELETE`, `entityType: PRODUCT`.

## 5. Liste

Paramètres d'URL : `q`, `category`, `status` (`current` par défaut = ACTIVE + DRAFT, `ACTIVE`, `DRAFT`, `ARCHIVED`), `stock` (`in | low | out`), `sort` (`name | -name | price | -price | stock | -stock | createdAt | -createdAt`, défaut `-createdAt`), `page` (défaut 1, 20 par page). Paramètres invalides → valeur par défaut.

Recherche : `q` normalisé (minuscules, sans accents) contenu dans `nameNormalized` ou dans le SKU.

Réponse : `{ items, total, page, pageCount }`.

## 6. Modules

| Fichier                                 | Rôle                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/lib/format.ts`                     | `formatPrice(cents)`, `parseEuros(text): number \| null`, `normalizeText(text)`, `slugify(text)` |
| `src/features/products/types.ts`        | types produit, niveau de stock                                                                   |
| `src/features/products/schemas.ts`      | `productFormSchema`, `stockAdjustmentSchema`, `productListQuerySchema`                           |
| `src/features/products/stats.ts`        | `statsDelta(before, after)`                                                                      |
| `src/features/products/list.ts`         | `filterSortPaginate(items, query)` (pur)                                                         |
| `src/features/products/repository.ts`   | accès `Products`, `Uniques`, `Stats` (transactions)                                              |
| `src/features/products/service.ts`      | règles métier, audit                                                                             |
| `src/features/products/actions.ts`      | Server Actions (`requireAdmin` en tête)                                                          |
| `src/features/products/components/*`    | table, cartes mobiles, filtres, formulaire, dialogues                                            |
| `src/features/categories/repository.ts` | `listActiveCategories()`, `findCategory(id)`                                                     |
| `src/components/ui/*`                   | `input`, `textarea`, `select`, `label`, `badge`, `dialog`, `alert-dialog`, `sonner`              |
| `src/components/data-table/*`           | `DataTable`, `FilterBar`, `SearchInput`, `Pagination`                                            |
| `src/components/feedback/*`             | `ConfirmDialog`, `ErrorState`, `StatusBadge`                                                     |

Permission ajoutée : `products:delete` (SUPER_ADMIN via `all`).

## 7. Interface

- `/admin/products` : `PageHeader` (+ « Ajouter un produit » si `products:write`), onglets de statut, `FilterBar`, table (desktop) / cartes (< 768 px), pagination « 1–20 sur N », `loading.tsx` (squelette), `error.tsx` (« Impossible de charger les produits. » + Réessayer), état vide et état « aucun résultat ».
- `/admin/products/new` et `/[id]/edit` : formulaire en sections Informations / Prix / Stock / Publication, slug auto tant qu'il n'a pas été modifié, avertissement de départ si modifications non enregistrées, toast puis redirection vers la fiche.
- `/admin/products/[id]` : informations, prix (promo barré), stock + niveau, catégorie, statut, dates, 10 dernières actions (audit), nombre de paniers et wishlists contenant le produit ; actions selon permissions.
- Dialogues : ajustement de stock ; confirmation d'archivage / restauration ; suppression avec saisie du SKU.
- Les boutons d'écriture ne s'affichent que si le rôle le permet ; le serveur revérifie toujours.

## 8. Données de démonstration

`pnpm db:seed` : catégories (idempotent, local ou `--aws`). `pnpm db:seed -- --demo` : ~40 produits variés (tous statuts et niveaux de stock), **refusé avec `--aws`**.

## 9. Tests

| Niveau      | Cas                                                                                                                                                                                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitaires   | schémas (règles de § 4) ; `parseEuros` / `formatPrice` ; `slugify` / `normalizeText` ; niveau de stock ; `statsDelta` (création, archivage, restauration, changement de catégorie, passage en rupture, suppression) ; `filterSortPaginate` (recherche sans accents, filtres, 8 tris, pages, paramètres invalides) |
| Intégration | création puis lecture ; SKU / slug en double ; modification avec changement de SKU (ancienne réservation libérée) ; conflit de version ; stock DELTA / SET / négatif refusé ; archivage / restauration ; suppression refusée si présent dans un panier ; compteurs `Stats` exacts après une séquence d'opérations |
| E2E         | création → toast → fiche ; recherche ; modification ; ajustement de stock ; archivage puis onglet Archivés ; `VIEWER` sans boutons d'écriture et 403 sur `/new` ; liste lisible à 375 px                                                                                                                          |

## 10. Critères d'acceptation

- Un SKU ou slug en double est refusé, même en requêtes simultanées.
- Prix, prix promo et stock invalides sont refusés côté serveur.
- Le stock ne devient jamais négatif ; chaque ajustement est journalisé.
- Deux modifications concurrentes : la seconde reçoit un conflit.
- Archiver ne casse aucun panier ni aucune wishlist ; la suppression définitive est protégée.
- Les compteurs `Stats` restent exacts après toute opération.
- La liste reste utilisable à 375 px ; chaque état (chargement, vide, aucun résultat, erreur) est géré.
