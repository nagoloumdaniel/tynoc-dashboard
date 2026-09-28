# Roadmap optimisée — Admin Dashboard E-commerce

**Stack : Next.js (App Router), React 19, TypeScript strict, Tailwind CSS v4, DynamoDB, GitHub, Vercel**

Objectif : une interface d'administration professionnelle et sécurisée pour superviser utilisateurs, produits, catégories, paniers et wishlists.

> Cette version remplace la roadmap initiale. Elle garde le même périmètre fonctionnel, mais réordonne le travail en **tranches verticales**, choisit une option par défaut à chaque décision et corrige plusieurs pièges techniques (auth dans le middleware seul, stats par `Scan`, secrets AWS longue durée, déploiement en fin de projet).

---

## 0. Ce qui change par rapport à la roadmap initiale

| # | Roadmap initiale | Version optimisée | Pourquoi |
|---|---|---|---|
| 1 | Déploiement en semaine 6 | **Walking skeleton déployé dès la semaine 1**, puis déploiement continu | Les problèmes d'environnement (IAM, variables, région) apparaissent tôt au lieu de bloquer la soutenance |
| 2 | Couches techniques construites l'une après l'autre (design system → auth → DB → produits) | **Tranches verticales** : le module Produits traverse toutes les couches et sert de modèle aux autres | On valide l'architecture une fois, puis on la duplique |
| 3 | Protection des routes via `middleware.ts` | Le proxy/middleware **redirige seulement** ; l'autorisation réelle est faite dans une **couche d'accès aux données** (`requireAdmin()`) appelée par chaque Server Action et chaque Route Handler | Un middleware seul se contourne (cf. CVE-2025-29927) ; règle `server-auth-actions` |
| 4 | Server Actions **et** API REST complète | **Server Actions par défaut** pour toutes les mutations internes ; Route Handlers seulement pour l'upload signé, les exports CSV et les éventuels clients externes | Moitié moins de surface d'API à sécuriser et à tester |
| 5 | Journal d'activité en Phase 10 | **Audit log écrit dans la même transaction** que chaque mutation, dès le module Produits | Impossible d'avoir une mutation sans trace ; rien à rattraper à la fin |
| 6 | Statistiques du dashboard : `Scan` ou Streams + Lambda | **Compteurs atomiques** (`ADD`) mis à jour dans la transaction de mutation | Lecture du dashboard en O(1), sans Lambda à déployer |
| 7 | Prix en `number` décimal, centimes « possibles » | **Montants en centimes (`priceInCents`) dès le départ** | Pas de migration de données plus tard |
| 8 | Suppression ou archivage | **Soft delete par défaut** (`status: "ARCHIVED"`) ; suppression définitive réservée à `SUPER_ADMIN` | Ne casse jamais les références panier/wishlist |
| 9 | Conflits de stock « facultatifs » | **Verrouillage optimiste** : attribut `version` + `ConditionExpression` sur toute mise à jour | Deux admins ne s'écrasent pas mutuellement |
| 10 | Clés AWS dans les variables d'environnement | **Vercel OIDC → rôle IAM AWS** (sans clé longue durée) en production ; clés locales uniquement pour DynamoDB Local | Aucun secret AWS à faire fuiter |
| 11 | Upload S3 par URL présignée PUT | **Presigned POST** avec condition `content-length-range` et `Content-Type` | La taille maximale est imposée par S3, pas seulement par le client |
| 12 | Mode sombre en P2 | **Tokens de couleur prêts pour le sombre dès la Phase 1**, bascule activée en P1 | Coût quasi nul si prévu d'emblée, coûteux si ajouté après |
| 13 | `next lint` dans les scripts | **`eslint .`** | `next lint` est retiré à partir de Next.js 16 |
| 14 | Choix entre plusieurs tables et single-table laissé ouvert | **Décision guidée (§ 6)** : respecter l'existant ; sinon plusieurs tables + table `Stats` | Délai de 6 semaines, lisibilité pour un jury |

---

## 1. Périmètre

### 1.1 MVP (P0 — obligatoire)

- Authentification admin + protection de toutes les routes `/admin`.
- Layout responsive (desktop, tablette, mobile à 375 px).
- Dashboard avec compteurs KPI.
- CRUD produits + gestion du stock + archivage.
- CRUD catégories avec suppression protégée.
- Liste, détail, modification et suspension des utilisateurs.
- Consultation des paniers et wishlists (liste + détail).
- Recherche, filtres, tri et pagination par curseur.
- Validation Zod côté client **et** serveur.
- Confirmation de toute action destructive.
- États chargement / vide / aucun résultat / erreur sur chaque page.
- Audit log sur chaque mutation.
- Déploiement continu + README.

### 1.2 P1 — forte valeur

- Upload d'images S3.
- RBAC complet (`SUPER_ADMIN`, `ADMIN`, `VIEWER`).
- Graphiques (Recharts).
- Alertes de stock faible.
- Page `/admin/activity` (le stockage des logs est déjà en P0).
- Mode sombre (bascule).
- Tests E2E Playwright sur les parcours critiques.

### 1.3 P2 — bonus

- Import/export CSV.
- Actions groupées.
- Recherche globale (⌘K).
- Notifications temps réel.
- Recherche plein texte (OpenSearch / Meilisearch via DynamoDB Streams).
- Statistiques comparatives avancées.

---

## 2. Choix techniques arrêtés

| Besoin | Choix | Alternative si contrainte |
|---|---|---|
| Framework | Next.js App Router (dernière version stable), Turbopack | — |
| Langage | TypeScript `strict` + `noUncheckedIndexedAccess` | — |
| Styles | Tailwind CSS v4 (config CSS-first via `@theme`) | — |
| Composants | shadcn/ui (Radix) — le code est copié dans le repo, donc personnalisable | — |
| Tables | TanStack Table (headless) derrière un `DataTable` maison | — |
| Formulaires | React Hook Form + `@hookform/resolvers/zod` | — |
| Validation | Zod v4, schémas partagés client/serveur | — |
| État d'URL (filtres, tri, curseur) | `nuqs` | `useSearchParams` natif |
| Toasts | Sonner (inclus dans shadcn/ui) | — |
| Graphiques | Recharts via les composants chart de shadcn/ui, chargés dynamiquement | Chart.js |
| Auth | **Réutiliser l'auth du projet e-commerce si elle existe**. Sinon Auth.js v5 (sessions JWT, provider Credentials, hash `argon2`) | Amazon Cognito si le projet est déjà « tout AWS » |
| Accès DynamoDB | AWS SDK v3 `@aws-sdk/lib-dynamodb` (DocumentClient) | ElectroDB si single-table |
| DB locale | DynamoDB Local (Docker) | LocalStack |
| Tests | Vitest + Testing Library, Playwright | Jest |
| CI | GitHub Actions | — |
| Hébergement | Vercel + rôle IAM via OIDC | AWS Amplify |
| Monitoring | Logs Vercel + Sentry | CloudWatch |

---

## 3. Architecture

```text
Navigateur
   ↓
Next.js (Vercel)
   ├── proxy.ts / middleware.ts  → redirection rapide si pas de cookie de session (UX uniquement)
   ├── Server Components         → lecture via services (React.cache pour dédupliquer)
   ├── Server Actions            → mutations internes
   ├── Route Handlers            → upload signé, export CSV, API externe éventuelle
   │
   └── Pour CHAQUE lecture/mutation :
         requireAdmin(permission)   ← source de vérité de l'autorisation
            ↓
         schéma Zod (parse)
            ↓
         service métier (règles, invariants)
            ↓
         repository DynamoDB (seul endroit qui connaît les clés et tables)
            ↓
         AWS DynamoDB  (+ S3 pour les images)
```

### Règles d'architecture non négociables

1. Le navigateur n'a **jamais** de credentials AWS ; aucune variable AWS n'est préfixée `NEXT_PUBLIC_`.
2. Chaque Server Action commence par `requireAdmin()` : c'est un endpoint public, il doit être traité comme tel.
3. Server Actions et Route Handlers appellent **les mêmes services** ; aucune logique métier n'est dupliquée.
4. Seuls les repositories importent le SDK AWS. Les fichiers serveur commencent par `import "server-only"`.
5. On ne transmet aux Client Components que les champs nécessaires (DTO), jamais l'item DynamoDB brut (`server-serialization`).

---

## 4. Structure du projet

```text
src/
├── app/
│   ├── (auth)/login/page.tsx
│   ├── admin/
│   │   ├── layout.tsx                 # sidebar + topbar ; appelle requireAdmin()
│   │   ├── page.tsx                   # dashboard (widgets en <Suspense> parallèles)
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [productId]/{page.tsx, edit/page.tsx}
│   │   ├── categories/
│   │   ├── users/[userId]/
│   │   ├── carts/[userId]/
│   │   ├── wishlists/[userId]/
│   │   ├── activity/
│   │   └── settings/
│   ├── api/
│   │   ├── uploads/route.ts           # presigned POST
│   │   └── exports/[entity]/route.ts  # CSV (P2)
│   ├── forbidden.tsx                  # 403
│   ├── error.tsx
│   ├── not-found.tsx
│   └── layout.tsx
│
├── components/
│   ├── ui/                            # shadcn/ui (button, dialog, input…)
│   ├── admin/                         # sidebar, topbar, page-header, stat-card
│   ├── data-table/                    # DataTable, Pagination, FilterBar, SearchInput
│   └── feedback/                      # EmptyState, ErrorState, ConfirmDialog, skeletons
│
├── features/
│   └── products/                      # même découpage pour categories, users, carts, wishlists
│       ├── actions.ts                 # Server Actions ("use server")
│       ├── service.ts                 # règles métier
│       ├── repository.ts              # accès DynamoDB uniquement
│       ├── schemas.ts                 # Zod (partagé client/serveur)
│       ├── types.ts
│       ├── components/                # ProductForm, ProductTable, StockDialog…
│       └── __tests__/
│
├── lib/
│   ├── auth/                          # session, requireAdmin(), permissions (RBAC)
│   ├── aws/                           # client DynamoDB/S3 singleton, helpers de transaction
│   ├── audit/                         # buildAuditLogPut() à inclure dans les transactions
│   ├── errors/                        # AppError + mapping HTTP / message utilisateur
│   ├── pagination/                    # encode/decode de curseur signé
│   └── env.ts                         # validation Zod des variables d'environnement
│
└── proxy.ts                           # (middleware.ts avant Next.js 16)

tests/e2e/                             # Playwright
docker-compose.yml                     # DynamoDB Local
scripts/{create-tables.ts, seed.ts}
```

- **Pas de fichiers barrel** (`index.ts` qui ré-exporte tout) : ils ralentissent le build et gonflent le bundle (`bundle-barrel-imports`).
- `features/*` regroupe ce qui change ensemble ; `components/ui` reste générique.

---

## 5. Design system

### 5.1 Direction visuelle

Sobre, dense, lisible — un outil de travail, pas une landing page.

- Fond gris très clair, surfaces blanches, bordures fines plutôt qu'ombres marquées.
- Une seule couleur d'accent (indigo) réservée aux actions principales et à l'état actif.
- Couleurs sémantiques **toujours doublées d'un texte ou d'une icône** (accessibilité).
- Chiffres en `tabular-nums` dans les tables et KPI pour qu'ils s'alignent.
- Rayons cohérents (`--radius: 0.5rem`), grille d'espacement de 4 px.

### 5.2 Tokens (Tailwind v4, clair + sombre dès le départ)

```css
@import "tailwindcss";

@theme {
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
}

:root {
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --border: #E2E8F0;
  --foreground: #0F172A;
  --muted: #64748B;
  --primary: #4F46E5;
  --primary-hover: #4338CA;
  --success: #16A34A;
  --warning: #B45309;   /* assombri pour atteindre 4.5:1 sur blanc */
  --danger: #DC2626;
  --info: #0284C7;
}

.dark {
  --background: #0B1120;
  --surface: #111827;
  --border: #1F2937;
  --foreground: #F1F5F9;
  --muted: #94A3B8;
  --primary: #818CF8;
  --primary-hover: #A5B4FC;
}
```

### 5.3 Typographie

- Geist (ou Inter) via `next/font` (aucune requête réseau externe).
- Titre de page `text-2xl font-semibold`, section `text-lg font-medium`, corps `text-sm`.

### 5.4 Composants

Fournis par shadcn/ui (à installer, pas à réécrire) : `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `Badge`, `Card`, `Dialog`, `AlertDialog`, `Sheet` (drawer), `DropdownMenu`, `Breadcrumb`, `Tabs`, `Skeleton`, `Sonner`, `Form`.

À construire (réutilisés par tous les modules) :

| Composant | Rôle |
|---|---|
| `PageHeader` | breadcrumb + titre + description + actions |
| `DataTable<T>` | table générique TanStack ; bascule en cartes sous `md` |
| `FilterBar` | filtres synchronisés à l'URL via `nuqs` ; drawer sur mobile |
| `SearchInput` | debounce 300 ms |
| `CursorPagination` | « Précédent / Suivant » basé sur curseur |
| `ConfirmDialog` | `AlertDialog` + nom de l'entité + conséquences + bouton désactivé pendant la requête |
| `EmptyState` / `NoResults` / `ErrorState` | les 3 états non nominaux, avec action |
| `StatCard` | icône + valeur + libellé + lien |
| `StatusBadge` | mappe chaque statut métier vers couleur + libellé |
| `ImageUpload` | prévisualisation, progression, réordonnancement (P1) |

Préférer la **composition** (sous-composants `DataTable.Toolbar`, `DataTable.Body`…) aux props booléennes empilées (`showSearch`, `showFilters`…).

---

## 6. Modélisation DynamoDB

### 6.1 Décision

```text
Le projet e-commerce a déjà des tables ?  → OUI → respecter son modèle, ajouter seulement des GSI et la table Stats.
                                           → NON → plusieurs tables (ci-dessous).
```

Le single-table design est plus performant mais plus long à concevoir et à expliquer ; sur 6 semaines, l'approche multi-tables avec des GSI bien choisis couvre tous les access patterns du MVP.

### 6.2 Tables et index

| Table | PK | SK | GSI | Access patterns couverts |
|---|---|---|---|---|
| `Products` | `id` | — | **GSI1** `categoryId` / `createdAt` · **GSI2** `status` / `nameNormalized` · **GSI3** `sku` (unicité) | par ID, par catégorie, par statut triés par nom, recherche par préfixe de nom, par SKU |
| `Categories` | `id` | — | **GSI1** `slug` · **GSI2** `parentId` / `sortOrder` | par ID, par slug, enfants d'une catégorie |
| `Users` | `id` | — | **GSI1** `email` · **GSI2** `role` / `createdAt` · **GSI3** `status` / `createdAt` | par ID, par email, par rôle, par statut |
| `Carts` | `userId` | `productId` | **GSI1** `productId` / `userId` | articles d'un utilisateur, paniers contenant un produit |
| `Wishlists` | `userId` | `productId` | **GSI1** `productId` / `addedAt` | idem wishlist |
| `AuditLogs` | `entityType#entityId` | `createdAt#logId` | **GSI1** `"LOG"` / `createdAt` · **GSI2** `actorId` / `createdAt` | historique d'une entité, fil global chronologique, actions d'un admin |
| `Stats` | `"GLOBAL"` ou `"CATEGORY#<id>"` | — | — | KPI du dashboard en une seule lecture |
| `Uniques` | `"SKU#<sku>"`, `"EMAIL#<email>"`, `"SLUG#<slug>"` | — | — | garantir l'unicité par transaction |

> Unicité : DynamoDB ne garantit pas l'unicité d'un attribut non-clé. On écrit donc un item `Uniques` avec `attribute_not_exists(pk)` **dans la même transaction** que la création. C'est la seule méthode sans condition de course.

### 6.3 Une mutation type (création de produit)

Une seule `TransactWriteItems` :

1. `Put` Products (`attribute_not_exists(id)`).
2. `Put` Uniques `SKU#<sku>` (`attribute_not_exists(pk)`) → échec = `ConflictError("SKU_TAKEN")`.
3. `Update` Stats `GLOBAL` : `ADD totalProducts :1`.
4. `Update` Stats `CATEGORY#<id>` : `ADD productCount :1`.
5. `Put` AuditLogs.

Tout réussit ou rien n'est écrit. Même schéma pour update (avec `version`), archivage, changement de stock.

### 6.4 Recherche textuelle

DynamoDB n'est pas un moteur de recherche. Stratégie MVP :

- stocker `nameNormalized` (minuscules, sans accents) ;
- recherche par **préfixe** via `begins_with` sur GSI2 ;
- recherche exacte par SKU/email via leur GSI ;
- documenter la limite (« commence par », pas « contient ») dans le README ;
- plein texte = P2 (OpenSearch/Meilisearch alimenté par Streams).

### 6.5 Pagination

- `Query` + `Limit` + `ExclusiveStartKey`.
- Le curseur renvoyé au client = `LastEvaluatedKey` encodé en base64url **et signé HMAC** (`AUTH_SECRET`) → un client ne peut pas forger une clé arbitraire.
- UI « Précédent / Suivant » : on garde la pile des curseurs précédents dans l'URL/état ; pas de numéros de page.
- Pas de `Scan` en dehors des scripts de seed et de migration.

---

## 7. Modèles TypeScript

Les types sont **inférés des schémas Zod** (`z.infer`) pour avoir une seule source de vérité.

```ts
// features/products/schemas.ts
import { z } from "zod";

export const productStatus = z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]);

export const productInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sku: z.string().trim().toUpperCase().min(2).max(50),
    description: z.string().max(5000).optional(),
    categoryId: z.string().min(1),
    priceInCents: z.number().int().nonnegative(),
    salePriceInCents: z.number().int().nonnegative().optional(),
    stock: z.number().int().nonnegative(),
    lowStockThreshold: z.number().int().nonnegative().default(5),
    imageKeys: z.array(z.string()).max(8).default([]),
    status: productStatus,
  })
  .refine(
    (d) => d.salePriceInCents === undefined || d.salePriceInCents < d.priceInCents,
    { message: "Le prix promotionnel doit être inférieur au prix standard.", path: ["salePriceInCents"] },
  );

export type ProductInput = z.infer<typeof productInput>;

export type Product = ProductInput & {
  id: string;
  nameNormalized: string;
  version: number;          // verrouillage optimiste
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};
```

```ts
type Category = {
  id: string; name: string; slug: string; description?: string;
  imageKey?: string; parentId?: string; sortOrder: number;
  isActive: boolean; version: number; createdAt: string; updatedAt: string;
};

type User = {
  id: string; name: string; email: string;
  role: "CUSTOMER" | "VIEWER" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  avatarUrl?: string; version: number;
  createdAt: string; updatedAt: string; lastLoginAt?: string;
};

type CartItem = { userId: string; productId: string; quantity: number; addedAt: string; updatedAt: string };
type WishlistItem = { userId: string; productId: string; addedAt: string };

type AuditLog = {
  id: string; actorId: string; actorEmail: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "DELETE" | "STOCK_ADJUST" | "ROLE_CHANGE" | "SUSPEND" | "LOGIN";
  entityType: "PRODUCT" | "CATEGORY" | "USER" | "CART" | "WISHLIST";
  entityId: string; summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;   // jamais de donnée sensible
  createdAt: string;
};
```

On stocke des **clés S3** (`imageKeys`), pas des URL : l'URL publique/CDN est calculée à l'affichage, ce qui permet de changer de bucket ou de CDN sans migration.

---

## 8. Authentification et autorisation

### 8.1 Fonctionnement

- `/login` → session en cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- `proxy.ts` : si pas de cookie de session sur `/admin/*` → redirection `/login?next=…` (confort uniquement).
- `app/admin/layout.tsx` : `await requireAdmin()` → `redirect("/login")` si non connecté, `forbidden()` (403) si rôle insuffisant.
- **Chaque** Server Action et Route Handler : `await requireAdmin("products:write")`.
- Déconnexion : suppression de session + audit log `LOGIN`/`LOGOUT`.
- Limitation des tentatives de connexion (ex. 5/15 min par IP + email).

### 8.2 RBAC

```ts
// lib/auth/permissions.ts
export const permissions = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["read", "products:write", "categories:write", "users:write", "carts:write"],
  VIEWER: ["read"],
} as const;
```

| Action | SUPER_ADMIN | ADMIN | VIEWER |
|---|:-:|:-:|:-:|
| Voir les données | ✓ | ✓ | ✓ |
| Gérer produits / catégories | ✓ | ✓ | — |
| Modifier / suspendre un utilisateur | ✓ | ✓ | — |
| Suppression définitive | ✓ | — | — |
| Changer un rôle / gérer les admins | ✓ | — | — |

Invariants codés dans `users/service.ts` (et testés) :

- un admin ne peut ni se supprimer, ni se suspendre, ni rétrograder son propre rôle ;
- un `ADMIN` ne peut pas attribuer `ADMIN` ou `SUPER_ADMIN` ;
- le dernier `SUPER_ADMIN` ne peut pas être supprimé ou rétrogradé.

L'interface masque les boutons non autorisés, **mais** le serveur revérifie toujours.

---

## 9. Modules fonctionnels

### 9.1 Produits — `/admin/products` (module de référence)

**Liste** : image, nom, SKU, catégorie, prix, stock, statut, date, actions.
Filtres URL : `q` (préfixe nom ou SKU exact), `category`, `status`, `stock=low|out`, `sort`, `cursor`.
Badges : Actif / Brouillon / Archivé + En stock / Stock faible / Rupture.

**Création** `/new` et **édition** `/[id]/edit` : même `ProductForm`.
- Slug généré depuis le nom, modifiable.
- Validation client (même schéma Zod) + serveur.
- Détection des changements, avertissement avant de quitter si modifications non sauvegardées.
- Envoi de `version` ; si conflit → message « Ce produit a été modifié par quelqu'un d'autre. Recharger ? ».
- Toast de succès puis redirection vers la fiche.

**Fiche** `/[id]` : infos, galerie, prix, stock, catégorie, dates, nombre de paniers et wishlists qui le contiennent (via GSI `productId`), historique (audit logs de l'entité).

**Stock** : dialogue d'ajustement rapide depuis la table (`+/-` ou nouvelle valeur + raison). Mise à jour conditionnelle `version = :v AND stock + :delta >= 0`, audit log `STOCK_ADJUST` avec `from/to/reason`.

**Suppression** : bouton « Archiver » par défaut → `ConfirmDialog` (nom du produit, conséquence : invisible en boutique, conservé dans les paniers existants). Suppression définitive visible uniquement pour `SUPER_ADMIN`, et refusée si le produit est référencé dans un panier.

### 9.2 Catégories — `/admin/categories`

- Colonnes : nom, slug, icône, nombre de produits (lu dans `Stats`), statut, ordre, actions.
- Formulaire : nom, slug unique (`Uniques`), description, image, parent, statut, ordre.
- Protection anti-cycle : on remonte la chaîne des parents avant d'enregistrer ; un parent ne peut pas être un descendant.
- Suppression **interdite tant que `productCount > 0`** ; message qui propose de déplacer les produits ou de désactiver la catégorie.

### 9.3 Utilisateurs — `/admin/users`

- Colonnes : avatar, nom, email (partiellement masqué pour `VIEWER`), rôle, statut, inscription, dernière activité.
- Filtres : rôle, statut ; recherche par email exact ou préfixe de nom.
- Détail `/[id]` : infos, rôle/statut, panier, wishlist, historique d'activité.
- Actions : modifier, suspendre/réactiver, anonymiser (RGPD), suppression définitive `SUPER_ADMIN` uniquement.
- Changement d'email : revérifie l'unicité via `Uniques` en transaction.

### 9.4 Paniers — `/admin/carts`

- Liste : utilisateur, nombre d'articles, quantité totale, montant estimé, dernière mise à jour, badge « abandonné » (> 7 jours sans mise à jour).
- Détail `/[userId]` : produits avec image, quantité, prix unitaire, sous-total, stock actuel, alerte si le produit est archivé ou en rupture.
- Lecture des produits en `BatchGetItem` (pas de requête par ligne).
- Actions admin (retirer un article, modifier une quantité, vider) : confirmation + audit log.

### 9.5 Wishlists — `/admin/wishlists`

- Liste : utilisateur, nombre de produits, dernière modification.
- Détail `/[userId]` : produits, disponibilité, prix, catégorie, date d'ajout, statut.
- Statistiques (dashboard) : produits les plus souhaités, produits souhaités mais en rupture — alimentées par un compteur `wishlistCount` sur chaque produit.

### 9.6 Dashboard — `/admin`

- **KPI** (une lecture `GetItem` sur `Stats#GLOBAL`) : utilisateurs, produits, catégories, articles en panier, articles en wishlist, ruptures, stock faible.
- **Widgets indépendants**, chacun dans son `<Suspense>` + son `error.tsx`/boundary : un widget en échec n'empêche pas les autres de s'afficher.
- Graphiques (P1) : nouveaux utilisateurs 30 j, produits par catégorie, top wishlist. Chargés via `next/dynamic`.
- Listes : 5 dernières activités, 5 derniers inscrits, alertes stock.
- Données en cache et invalidées par tag après chaque mutation (`revalidateTag("stats")`).

### 9.7 Activité — `/admin/activity`

Fil chronologique paginé (GSI1), filtres par admin (GSI2), entité, action et période ; détail avec le diff `changes`.

---

## 10. États d'interface (chaque page)

| État | Rendu |
|---|---|
| Chargement | `loading.tsx` avec skeleton ayant la forme finale (table, cartes) |
| Vide | « Aucun produit n'a encore été ajouté. » + **[Ajouter un produit]** |
| Aucun résultat | « Aucun produit ne correspond à vos filtres. » + **[Réinitialiser les filtres]** |
| Erreur | « Impossible de charger les produits. » + **[Réessayer]** (`reset()`) |
| Mutation en cours | bouton désactivé + spinner via `useTransition` / `useFormStatus` |
| Succès | toast Sonner + redirection cohérente |

---

## 11. Erreurs

```ts
// lib/errors/index.ts
export class AppError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export const NotFound     = (code: string, msg: string) => new AppError(code, 404, msg);
export const Unauthorized = () => new AppError("UNAUTHENTICATED", 401, "Veuillez vous connecter.");
export const Forbidden    = () => new AppError("FORBIDDEN", 403, "Action non autorisée.");
export const Conflict     = (code: string, msg: string) => new AppError(code, 409, msg);
export const Invalid      = (msg: string) => new AppError("VALIDATION_ERROR", 400, msg);
```

- Les Server Actions retournent `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }` — jamais d'exception brute vers le client.
- `ConditionalCheckFailedException` / `TransactionCanceledException` sont traduites en `Conflict` avec un code métier (`SKU_TAKEN`, `VERSION_CONFLICT`, `OUT_OF_STOCK`).
- Jamais renvoyé au client : stack trace, nom de table, payload AWS, données sensibles. Tout est loggé côté serveur avec un `requestId`.

---

## 12. Upload d'images (P1)

1. Le client demande `POST /api/uploads` avec `{ contentType, size }`.
2. Le serveur : `requireAdmin("products:write")`, vérifie type (`image/jpeg|png|webp`) et taille (≤ 5 Mo), génère la clé `products/<uuid>.<ext>`.
3. Il renvoie un **presigned POST** avec conditions `content-length-range` et `Content-Type`.
4. Le client envoie le fichier directement à S3 (barre de progression).
5. La clé est ajoutée à `imageKeys` à l'enregistrement du produit.
6. Les images orphelines (uploadées mais jamais enregistrées) sont nettoyées par une règle de cycle de vie S3 sur le préfixe `tmp/`.
7. Affichage via `next/image` avec le domaine du bucket/CDN autorisé dans `next.config`.

---

## 13. Performance

- Server Components par défaut ; `"use client"` uniquement sur les feuilles interactives (formulaires, table, filtres).
- Lectures indépendantes en `Promise.all` ; widgets en `<Suspense>` parallèles (`async-parallel`, `server-parallel-fetching`).
- `React.cache()` sur `getSession()` et les lectures répétées dans une même requête (`server-cache-react`).
- Écriture de l'audit log non bloquante hors transaction (ex. login) via `after()` (`server-after-nonblocking`).
- Recharts et le formulaire d'image en `next/dynamic` (`bundle-dynamic-imports`).
- `ProjectionExpression` pour ne lire que les attributs affichés.
- `BatchGetItem` pour les jointures panier/wishlist → produits.
- Toutes les listes paginées (20 par défaut, 100 max).

---

## 14. Accessibilité

- Labels reliés aux champs, erreurs reliées par `aria-describedby`.
- Focus visible partout ; navigation complète au clavier ; lien « Aller au contenu ».
- Dialogues Radix (focus trap et `Escape` inclus).
- Contraste ≥ 4.5:1 (texte) — vérifié sur les tokens clair et sombre.
- Statuts jamais transmis uniquement par la couleur.
- Toasts dans une région `aria-live`.
- `prefers-reduced-motion` respecté.
- Contrôle automatique : `@axe-core/playwright` dans les tests E2E + Lighthouse ≥ 90 en accessibilité.

---

## 15. Responsive

| Largeur | Navigation | Tables | Filtres | Formulaires |
|---|---|---|---|---|
| ≥ 1024 px | sidebar fixe, rétractable | toutes les colonnes | barre horizontale | 2 colonnes |
| 768–1023 px | sidebar en icônes | colonnes secondaires masquées | grille | 2 colonnes |
| < 768 px | drawer (`Sheet`) | **cartes** | drawer | 1 colonne, cibles ≥ 44 px |

Critère : chaque page est utilisable à **375 px** sans scroll horizontal de la page.

---

## 16. Tests

| Niveau | Outil | Ce qu'on teste | Quand |
|---|---|---|---|
| Unitaire | Vitest | schémas Zod, permissions, invariants utilisateurs, calculs panier, curseur signé, anti-cycle catégories | écrits **avant** le code (TDD) |
| Intégration | Vitest + DynamoDB Local | services + repositories : SKU dupliqué, conflit de version, stock négatif refusé, suppression catégorie non vide, compteurs `Stats` cohérents | à chaque module |
| E2E | Playwright + axe | login, CRUD produit, filtre + pagination, archivage avec confirmation, accès refusé VIEWER, rendu 375 px | parcours critiques, sur chaque PR |

La couche service est la plus testée : c'est là que vivent les règles métier.

---

## 17. Qualité, Git et CI

### Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:up": "docker compose up -d dynamodb",
    "db:create": "tsx scripts/create-tables.ts",
    "db:seed": "tsx scripts/seed.ts"
  }
}
```

### Branches et commits

- `main` protégée (PR obligatoire + CI verte) ; branches `feat/*`, `fix/*`, `chore/*`.
- Conventional Commits : `feat(products): add stock adjustment dialog`.
- Chaque PR : objectif, captures, procédure de test, impact DynamoDB (tables/GSI), variables ajoutées, checklist.

### GitHub Actions (sur chaque PR)

```text
install (cache pnpm) → typecheck → lint → test (unit + intégration avec service DynamoDB Local) → build → E2E Playwright
```

Déploiement : Vercel crée une preview par PR ; merge sur `main` = production.

---

## 18. Variables d'environnement

```env
# .env.example
AWS_REGION=eu-west-3
DYNAMODB_ENDPOINT=              # http://localhost:8000 en local, vide en prod
DYNAMODB_TABLE_PREFIX=admin-    # admin-Products, admin-Users…
AWS_S3_BUCKET=
AWS_ROLE_ARN=                   # prod : rôle assumé via Vercel OIDC
AUTH_SECRET=                    # aussi utilisé pour signer les curseurs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- `lib/env.ts` valide toutes les variables avec Zod au démarrage (échec explicite si une variable manque).
- `.env*` dans `.gitignore`, sauf `.env.example`.
- Production : **Vercel OIDC federation → rôle IAM** avec une politique limitée aux tables et au bucket du projet (actions `dynamodb:GetItem/PutItem/UpdateItem/DeleteItem/Query/BatchGetItem/TransactWriteItems`, `s3:PutObject/GetObject/DeleteObject`). Pas de `AWS_SECRET_ACCESS_KEY` en production.

---

## 19. Monitoring

- Sentry (erreurs client + serveur) avec filtrage des données personnelles.
- Logs structurés JSON (`requestId`, `actorId`, `action`, durée) — jamais de mot de passe, token, cookie ou payload complet.
- Surveiller : taux d'erreur des actions, `ConditionalCheckFailed` fréquents, échecs de connexion, throttling DynamoDB.

---

## 20. Plan par phases (tranches verticales)

Chaque phase se termine par : CI verte, déploiement en production, démo de la fonctionnalité.

### Phase 0 — Analyse (½ jour à 1 jour)

- Auditer le projet e-commerce : routes, auth existante, tables DynamoDB, stockage des images.
- Écrire la liste des access patterns (§ 6) et trancher multi-tables / existant.
- **Livrables** : `docs/architecture.md` (schéma + tables + access patterns), backlog GitHub Projects avec les issues P0.

### Phase 1 — Walking skeleton (semaine 1)

- `create-next-app` (TS, Tailwind v4, App Router, `src/`), TS strict, ESLint + Prettier, Vitest, Playwright.
- shadcn/ui init + tokens clair/sombre + police.
- Layout `/admin` : sidebar, topbar, drawer mobile, route active.
- `docker-compose.yml` DynamoDB Local + scripts `create-tables` / `seed`.
- `lib/env.ts`, client DynamoDB singleton, `AppError`.
- GitHub Actions + projet Vercel connecté → **premier déploiement**.
- **Livrable** : une page `/admin` vide mais déployée, CI verte.

### Phase 2 — Authentification & RBAC (semaine 1)

- `/login`, session, déconnexion, `proxy.ts`, `requireAdmin()`, `forbidden.tsx`, rate limiting.
- Tests unitaires des permissions et invariants.
- **Livrable** : `/admin` inaccessible sans session ; VIEWER reçoit 403 sur une action d'écriture.

### Phase 3 — Produits : tranche de référence (semaines 2–3)

- Schémas, repository, service, actions — avec transactions, `Uniques`, `Stats`, `AuditLogs`, `version`.
- `DataTable`, `FilterBar`, `SearchInput`, `CursorPagination`, `ConfirmDialog`, `EmptyState`, `ErrorState`.
- Liste, création, fiche, édition, ajustement de stock, archivage.
- Tests unitaires + intégration + 1er E2E.
- **Livrable** : module produits complet ; tous les composants partagés existent.

### Phase 4 — Catégories (semaine 3)

- Réutilise l'intégralité des composants de la Phase 3.
- Slug unique, anti-cycle, suppression protégée par `productCount`.
- **Livrable** : CRUD catégories + filtre catégorie actif sur les produits.

### Phase 5 — Utilisateurs (semaine 4)

- Liste, filtres, détail, modification, suspension, anonymisation, invariants de rôle.
- **Livrable** : module utilisateurs sécurisé, testé.

### Phase 6 — Paniers & wishlists (semaine 4)

- Listes + détails, jointures `BatchGetItem`, actions admin confirmées, compteurs `wishlistCount`.
- Détail utilisateur enrichi (panier + wishlist).
- **Livrable** : vues maître/détail.

### Phase 7 — Dashboard & activité (semaine 5)

- KPI depuis `Stats`, widgets `<Suspense>` indépendants, alertes stock, derniers inscrits/produits.
- Graphiques Recharts (P1), page `/admin/activity`.
- Upload S3 (P1), bascule mode sombre (P1).
- **Livrable** : dashboard complet, sans aucun `Scan`.

### Phase 8 — Durcissement & livraison (semaine 6)

- Compléter les E2E, axe + Lighthouse, test manuel à 375 px.
- Revue de sécurité (permissions sur chaque action, IAM minimal, en-têtes, absence de secrets).
- README complet, captures, compte de démo `VIEWER` en lecture seule.
- **Livrable** : lien live, dépôt propre, documentation.

### Récapitulatif

| Semaine | Contenu | Déployé en fin de semaine |
|---|---|---|
| 1 | Analyse, skeleton, CI/CD, layout, auth | `/login` + `/admin` protégé |
| 2 | Produits : données, liste, recherche, pagination | liste produits réelle |
| 3 | Produits : formulaires, stock, archivage · Catégories | CRUD produits + catégories |
| 4 | Utilisateurs · Paniers · Wishlists | tous les modules de consultation |
| 5 | Dashboard, graphiques, activité, S3, mode sombre | dashboard complet |
| 6 | Tests, accessibilité, sécurité, README, captures | version finale |

---

## 21. Critères d'acceptation

**Produits**
- Un produit valide est créé ; un SKU en double est refusé (409) même en cas de requêtes simultanées.
- Prix ou stock négatif refusé côté serveur, même en contournant le formulaire.
- Deux modifications concurrentes : la seconde reçoit `VERSION_CONFLICT`.
- L'ajustement de stock ne peut jamais produire un stock négatif.
- L'archivage demande confirmation et ne casse aucun panier/wishlist.

**Catégories**
- Slug unique ; un cycle parent/enfant est refusé.
- Une catégorie avec produits ne peut pas être supprimée ; la liste affiche le nombre de produits.

**Utilisateurs**
- Seuls les rôles autorisés modifient ; un admin ne peut pas se supprimer, se suspendre ni s'auto-promouvoir.
- Le détail affiche panier et wishlist ; aucune donnée sensible dans les logs.

**Dashboard**
- KPI affichés en une lecture ; un widget en erreur n'empêche pas les autres ; aucun `Scan` en production.

**Transverse**
- Chaque mutation produit un audit log.
- Toutes les pages sont utilisables à 375 px et au clavier.
- Chaque page gère chargement, vide, aucun résultat et erreur.

---

## 22. README attendu

1. Présentation + lien live + compte de démo
2. Captures d'écran
3. Fonctionnalités
4. Stack et choix techniques (avec justification)
5. Architecture (schéma § 3)
6. Modèle DynamoDB (tables, GSI, access patterns)
7. Installation locale (`pnpm i`, `pnpm db:up`, `pnpm db:create`, `pnpm db:seed`, `pnpm dev`)
8. Variables d'environnement
9. Scripts
10. Authentification et rôles
11. Tests
12. Déploiement (Vercel + OIDC AWS)
13. Sécurité
14. Limites connues (recherche par préfixe, etc.)
15. Améliorations futures
16. Auteur

### Captures à fournir

Connexion · Dashboard desktop · Dashboard mobile · Liste produits · Formulaire produit · Fiche produit · Ajustement de stock · Catégories · Utilisateurs · Détail utilisateur · Détail panier · Détail wishlist · Dialogue de confirmation · État vide · Skeleton · État d'erreur · Mode sombre.

---

## 23. Checklist finale

**Fonctionnel**
- [ ] Auth opérationnelle, routes admin protégées, 403 correct
- [ ] Dashboard sur `Stats` (sans `Scan`)
- [ ] CRUD produits + stock + archivage
- [ ] CRUD catégories avec suppression protégée
- [ ] Utilisateurs : liste, détail, modification et suspension sécurisées
- [ ] Paniers et wishlists consultables
- [ ] Recherche, filtres, tri, pagination par curseur
- [ ] Confirmation de toute action destructive
- [ ] Audit log sur chaque mutation
- [ ] États chargement / vide / aucun résultat / erreur

**UI/UX**
- [ ] Utilisable à 375 px, tablette, desktop
- [ ] Navigation clavier et focus visible
- [ ] Contrastes vérifiés (clair et sombre)
- [ ] Toasts et retours sur chaque action

**Sécurité**
- [ ] `requireAdmin()` dans chaque Server Action et Route Handler
- [ ] Aucun credential dans le repo ; `.env.example` fourni
- [ ] OIDC + IAM minimal en production
- [ ] Validation Zod serveur partout ; curseurs signés
- [ ] Aucune stack trace ni nom de table exposé
- [ ] Uploads limités (type + taille imposés par S3)

**Qualité**
- [ ] `typecheck`, `lint`, `test`, `build`, `test:e2e` verts en CI
- [ ] Aucun `console.log` de debug
- [ ] Code organisé par domaine (`features/*`)

**Livraison**
- [ ] Dépôt propre, README complet, captures
- [ ] Lien live fonctionnel, compte de démo en lecture seule
- [ ] Instructions d'installation testées sur une machine propre

---

## 24. Skills Claude Code à utiliser par phase

| Phase / tâche | Skills |
|---|---|
| Avant chaque module | `brainstorming` → `writing-plans` |
| Implémentation d'un plan | `subagent-driven-development` ou `executing-plans` |
| Direction visuelle, tokens, layout | `frontend-design`, `taste-skill`, `design:design-system`, `emil-design-eng` |
| Composants réutilisables (`DataTable`, `FilterBar`…) | `composition-patterns`, `anthropic-skills:web-component-design` |
| Pages, data fetching, Server Actions | `react-best-practices`, `anthropic-skills:react-nextjs-development` |
| Repositories, services, API | `anthropic-skills:backend-patterns` |
| Toasts | `ask-sonner` |
| Graphiques et KPI | `dataviz` |
| Micro-interactions (dialogues, drawer, skeletons) | `find-animation-opportunities` → `animate` → `review-animations` |
| Textes d'interface, messages d'erreur, états vides | `design:ux-copy` |
| Règles métier | `test-driven-development` |
| Bug | `investigate-first` → `systematic-debugging` → `surgical-patch` |
| Accessibilité / UX | `web-design-guidelines`, `design:accessibility-review` |
| Revue avant merge | `requesting-code-review`, `code-review`, `security-review`, `simplify` |
| Lancer et vérifier l'app | `run`, `verification-before-completion` |
| Commits / fin de branche | `caveman-commit`, `finishing-a-development-branch` |
| README et docs | `anthropic-skills:technical-writer`, `anthropic-skills:docs-writer` |

---

## 25. Ordre de réalisation

```text
Analyse & access patterns
→ Walking skeleton déployé (tooling, CI/CD, layout, DynamoDB Local)
→ Auth & RBAC
→ Produits (tranche de référence : transactions, audit, stats, composants partagés)
→ Catégories
→ Utilisateurs
→ Paniers / Wishlists
→ Dashboard & activité (+ S3, graphiques, mode sombre)
→ Durcissement (tests, a11y, sécurité)
→ Documentation & soumission
```
