# Phase 6 — Paniers et wishlists : design

**Date :** 2026-09-30
**Statut :** validé en discussion
**Roadmap :** [ROADMAP.md](../../../ROADMAP.md) § 12, § 13 et § 20 (Phase 6)

## 1. Objectif

Consulter les paniers et wishlists des clients (listes et détails) ; permettre à un administrateur de retirer un article ou de tout vider, avec confirmation et audit.

## 2. Données

```ts
type CartItem = {
  userId: string;
  productId: string; // clé
  quantity: number;
  addedAt: string;
  updatedAt: string;
  feed: "CART"; // clé de partition de l'index byFeed
};

type WishlistItem = {
  userId: string;
  productId: string;
  addedAt: string;
  feed: "WISHLIST";
};
```

- Nouvel index `byFeed` : `Carts (feed, updatedAt)`, `Wishlists (feed, addedAt)`. Il permet de lister toutes les lignes sans `Scan`. **Contrat pour la boutique :** chaque écriture de ligne renseigne `feed` et les dates.
- `ensureTables` ajoute aux tables existantes les index manquants (`UpdateTable`, un index à la fois, attente de l'état `ACTIVE`). Production : `pnpm db:create -- --aws` après le merge.
- Compteurs `Stats GLOBAL` : `cartItems` et `wishlistItems` = nombre de lignes ; diminués lors des retraits par un administrateur.

## 3. Règles

- **Valeur estimée** d'une ligne : `quantité × (prix promo ?? prix)` au moment de la consultation ; produit supprimé → 0.
- **Disponibilité** d'une ligne : `DELETED` (produit introuvable), `ARCHIVED`, `OUT` (stock 0), `INSUFFICIENT` (stock < quantité, panier seulement), `OK`.
- **Panier abandonné** : non vide et `updatedAt` le plus récent antérieur à 7 jours.
- **Actions** (`carts:write`, ADMIN et SUPER_ADMIN) : retirer une ligne ; vider. Refus si la ligne n'existe plus (`ITEM_NOT_FOUND`). Audit `entityType: CART | WISHLIST`, `entityId: userId`, actions `REMOVE_ITEM` et `EMPTY`.

## 4. Lecture

- Listes : `Query byFeed` (projection `userId, productId, quantity, updatedAt/addedAt`), regroupement par client, `BatchGet` des utilisateurs (nom, email) et des produits (prix, stock, statut), puis recherche (nom, email), filtres et tris en mémoire, 20 par page.
- Paniers : filtre « abandonnés seulement », tri `-updatedAt` (défaut), `updatedAt`, `-value`.
- Wishlists : tri `-addedAt` (défaut), `-count`.
- Détail : `Query` par `userId` + `BatchGet` des produits.

## 5. Interface

- `/admin/carts` : client (nom, email), lignes, quantité totale, valeur estimée, dernière mise à jour, badge « Abandonné » ; recherche, filtre, tri, pagination ; cartes mobiles ; états.
- `/admin/carts/[userId]` : lignes (produit avec lien, prix, quantité, sous-total, disponibilité), total ; « Retirer » par ligne et « Vider le panier » (confirmations).
- `/admin/wishlists` et `/admin/wishlists/[userId]` : même structure (produits, date d'ajout, disponibilité).
- Fiche utilisateur : liens vers son panier et sa wishlist. Fiche produit : lien vers les paniers qui le contiennent (`/admin/carts?product=<id>`).

## 6. Démonstration

`db:seed -- --demo` : ~15 paniers (dont des abandonnés) et ~20 wishlists pour les clients de démonstration, compteurs mis à jour.

## 7. Tests

| Niveau      | Cas                                                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unitaires   | index manquants à créer ; résumé de panier (valeur, abandon, disponibilité) ; résumé de wishlist ; filtres, tris, pagination |
| Intégration | liste via `byFeed` ; détail ; retrait d'une ligne (compteur −1, audit) ; vidage ; ligne déjà retirée                         |
| E2E         | liste et détail d'un panier ; retrait confirmé ; vidage ; wishlist ; lecteur sans actions                                    |

## 8. Hors périmètre

Modification des quantités, commandes, relance des paniers abandonnés, export.
