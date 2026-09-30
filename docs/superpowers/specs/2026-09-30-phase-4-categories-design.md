# Phase 4 — Catégories : design

**Date :** 2026-09-30
**Statut :** validé en discussion
**Roadmap :** [ROADMAP.md](../../../ROADMAP.md) § 10 et § 20 (Phase 4)

## 1. Objectif

Gérer les catégories depuis `/admin/categories` : liste hiérarchique, création, modification, activation / désactivation, suppression protégée. Un niveau de sous-catégories.

## 2. Modèle

```ts
type Category = {
  id: string; // immuable (les 6 catégories de départ gardent cat_<slug>)
  name: string; // 2–60
  slug: string; // unique : Uniques CATEGORY_SLUG#<slug>
  description?: string; // ≤ 500
  parentId: string; // "ROOT" pour une catégorie principale, sinon id d'une principale
  sortOrder: number; // 0–9 999
  isActive: boolean;
  version: number; // absent sur les catégories créées avant la phase 4 → traité comme 1
  createdAt: string;
  updatedAt: string;
};
```

Nouvelles catégories : id `cat_<uuid court>`.

## 3. Règles

| Règle                                                                  | Code d'erreur           | Message                                                                         |
| ---------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| Slug unique                                                            | `CATEGORY_SLUG_TAKEN`   | Ce slug de catégorie est déjà utilisé.                                          |
| Le parent existe et est une catégorie principale                       | `PARENT_INVALID`        | Choisissez une catégorie principale existante.                                  |
| Une catégorie ne peut pas être son propre parent                       | `PARENT_INVALID`        | idem                                                                            |
| Changer le parent d'une catégorie qui a des sous-catégories            | `CATEGORY_HAS_CHILDREN` | Cette catégorie a des sous-catégories : elle doit rester principale.            |
| Supprimer une catégorie qui a des sous-catégories                      | `CATEGORY_HAS_CHILDREN` | Supprimez ou déplacez d'abord ses sous-catégories.                              |
| Supprimer une catégorie qui contient des produits (y compris archivés) | `CATEGORY_NOT_EMPTY`    | Cette catégorie contient N produit(s). Déplacez-les ou désactivez la catégorie. |
| Modification concurrente                                               | `VERSION_CONFLICT`      | Cette catégorie a été modifiée par quelqu'un d'autre. Rechargez la page.        |

- **Catégorie utilisable par un produit** : active, et si c'est une sous-catégorie, son parent est actif aussi.
- **Désactivation** : n'affecte pas les produits existants (toujours affichés et filtrables).
- **Compteurs** : `Stats GLOBAL.totalCategories` (+1 création, −1 suppression) ; `Stats CATEGORY#<id>.productCount` (maintenu par les produits) ; une principale affiche son compte + celui de ses sous-catégories.
- **Audit** (`entityType: CATEGORY`) : `CREATE`, `UPDATE` (champs modifiés), `ACTIVATE` / `DEACTIVATE`, `DELETE`.
- **Permissions** : lecture `read` ; toute écriture `categories:write`.

## 4. Lecture

- Arbre : `Query byParent parentId = "ROOT"`, puis une `Query byParent` par principale (en parallèle) ; jamais de `Scan`.
- Compteurs : `BatchGetItem` sur `Stats CATEGORY#…`.
- Produits d'une catégorie (suppression) : `Query Products byCategory` en `Select: COUNT`.

## 5. Intégration aux produits

- Formulaire produit : liste des catégories utilisables, libellés « Mobilier » et « Mobilier › Chaises ».
- Filtre de la liste produits : une catégorie principale inclut ses sous-catégories.
- Table et fiche produit : nom complet « Parent › Enfant ».

## 6. Interface

- `/admin/categories` : en-tête + « Nouvelle catégorie » (si permission) ; recherche par nom et filtre Toutes / Actives / Inactives (en mémoire, liste courte) ; table hiérarchique (sous-catégories indentées) : nom, slug, produits, statut, actions (Modifier, Activer / Désactiver, Supprimer) ; cartes sous 768 px ; état vide.
- Dialogue de création / modification : nom, slug automatique tant qu'il n'est pas modifié, description, parent (« Aucune (catégorie principale) » + principales, sauf elle-même ; verrouillé avec explication si elle a des sous-catégories), ordre, active.
- Suppression : `ConfirmDialog` ; l'erreur métier s'affiche dans le dialogue.

## 7. Tests

| Niveau      | Cas                                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitaires   | schéma (nom, slug, ordre, parent) ; `buildCategoryTree` (tri, indentation, compteurs agrégés) ; `categoryOptions` (libellés, catégories inutilisables exclues) ; `expandCategory` (principale → elle + enfants)                                                                                                                                                           |
| Intégration | création principale / sous-catégorie ; slug en double ; parent sous-catégorie refusé ; modification du slug (ancien libéré) ; changement de parent refusé si enfants ; conflit de version (y compris catégorie sans `version`) ; suppression refusée si enfants ou produits ; suppression d'une catégorie vide ; `totalCategories` exact ; utilisabilité (parent inactif) |
| E2E         | créer une sous-catégorie → l'utiliser pour un produit → filtrer la liste produits par la principale → suppression refusée ; désactivation ; lecteur sans actions                                                                                                                                                                                                          |

## 8. Hors périmètre

Image / icône (phase 7), glisser-déposer pour l'ordre, plus d'un niveau de profondeur.
