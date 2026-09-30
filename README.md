# Tynoc Admin

Tableau de bord d'administration e-commerce : produits, catégories, utilisateurs, paniers et wishlists.

**Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, Radix UI, DynamoDB, Vitest, Playwright.

La feuille de route complète et les choix d'architecture sont dans [ROADMAP.md](ROADMAP.md).

## État d'avancement

- [x] Phase 1 — Squelette : outillage, CI, DynamoDB Local, layout responsive
- [x] Phase 2 — Authentification et rôles
- [x] Phase 3 — Produits
- [x] Phase 4 — Catégories
- [x] Phase 5 — Utilisateurs
- [x] Phase 6 — Paniers et wishlists
- [ ] Phase 7 — Dashboard et activité (7a tableau de bord fait ; 7b images S3 et 7c notifications à venir)
- [ ] Phase 8 — Durcissement et livraison

## Installation locale

Prérequis : Node.js 24, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env.local
pnpm db:up        # démarre DynamoDB Local sur le port 8000
pnpm db:create    # crée les tables (idempotent)
pnpm db:seed      # compteurs + 6 catégories de départ
pnpm db:seed -- --demo  # facultatif : ~40 produits de démonstration (local uniquement)
pnpm admin:create # premier super administrateur (email, nom, mot de passe)
pnpm dev          # http://localhost:3000/login
```

## Scripts

| Script               | Rôle                                               |
| -------------------- | -------------------------------------------------- |
| `pnpm dev`           | serveur de développement                           |
| `pnpm build`         | build de production                                |
| `pnpm typecheck`     | génère les types de routes puis vérifie TypeScript |
| `pnpm lint`          | ESLint                                             |
| `pnpm format`        | Prettier (écriture)                                |
| `pnpm test`          | tests unitaires + intégration (DynamoDB Local)     |
| `pnpm test:unit`     | tests unitaires seuls (sans Docker)                |
| `pnpm test:e2e`      | tests Playwright (desktop + mobile 375 px)         |
| `pnpm ci:local`      | CI complète en local (`--quick` : sans build/E2E)  |
| `pnpm db:up`/`down`  | démarre / arrête DynamoDB Local                    |
| `pnpm db:create`     | crée les tables DynamoDB Local                     |
| `pnpm db:seed`       | insère les données initiales                       |
| `pnpm db:test:reset` | recrée les tables de test et leurs comptes         |
| `pnpm admin:create`  | crée un admin ou réinitialise son mot de passe     |

## CI locale

GitHub Actions n'étant pas disponible sur ce compte, la CI tourne en local : `pnpm install` active le hook `.githooks/pre-push`, qui exécute `pnpm ci:local` (format, types, lint, tests unitaires, build, E2E) avant chaque push. Le workflow `.github/workflows/ci.yml` reste prêt si Actions redevient disponible.

Tester un déploiement : `E2E_BASE_URL=https://tynoc-dashboard.vercel.app pnpm test:e2e`.

## Variables d'environnement

| Variable                | Défaut      | Rôle                                                 |
| ----------------------- | ----------- | ---------------------------------------------------- |
| `AWS_REGION`            | `eu-west-3` | région AWS                                           |
| `DYNAMODB_ENDPOINT`     | —           | `http://localhost:8000` en local, vide en production |
| `DYNAMODB_TABLE_PREFIX` | `tynoc-`    | préfixe des noms de tables                           |
| `AWS_ROLE_ARN`          | —           | production : rôle IAM assumé via Vercel OIDC         |
| `CRON_SECRET`           | —           | production : secret du cron quotidien (≥ 16 car.)    |

Les variables sont validées au démarrage par [src/lib/env.ts](src/lib/env.ts). Aucun secret AWS n'est committé ; en production l'accès passe par un rôle IAM (OIDC).

## Produits

- Liste `/admin/products` : recherche sur le nom et le SKU (sans tenir compte des accents), filtres statut / catégorie / niveau de stock, 8 tris, 20 produits par page. Les filtres sont dans l'URL.
- Création, fiche, modification, ajustement de stock avec raison, archivage / restauration (en brouillon), suppression définitive réservée au super administrateur et refusée si le produit est dans un panier ou une wishlist.
- Montants en centimes ; SKU et slug uniques ; verrouillage optimiste (`version`) ; chaque écriture met à jour les compteurs du tableau de bord et le journal d'activité dans la même transaction DynamoDB.
- **Limite connue :** la liste charge le catalogue via l'index `byStatus` puis filtre en mémoire, adapté à quelques milliers de produits. Au-delà (~5 000), prévoir un moteur de recherche (OpenSearch, Meilisearch).

## Catégories

- `/admin/categories` : liste hiérarchique (un niveau de sous-catégories), recherche, filtre actives / inactives, création et modification dans une fenêtre, activation / désactivation, suppression.
- Suppression refusée tant que la catégorie contient des produits (même archivés) ou des sous-catégories ; une catégorie désactivée n'est plus proposée pour les nouveaux produits, sans toucher aux produits existants.
- Côté produits : libellés « Parent › Enfant », et filtrer par une catégorie principale inclut ses sous-catégories.

## Utilisateurs

- `/admin/users` : clients et administrateurs, recherche nom / email, filtres type et statut, tri, pagination ; emails masqués pour les comptes en lecture seule.
- Fiche : informations, panier et wishlist (compteurs), historique ; modification, suspension / réactivation, changement de rôle, réinitialisation du mot de passe, anonymisation RGPD.
- Un administrateur gère les clients ; seul un super administrateur gère les administrateurs, les rôles et l'anonymisation. Personne n'agit sur son propre compte (suspension, rôle, anonymisation) et le dernier super administrateur actif est protégé.
- Nouvel administrateur : mot de passe temporaire affiché une seule fois, à remplacer obligatoirement à la première connexion (`/compte/mot-de-passe`). « Changer mon mot de passe » est dans le menu du compte.

## Paniers et wishlists

- `/admin/carts` : paniers par client, valeur estimée au prix actuel (promo comprise), badge « Abandonné » après 7 jours sans modification, recherche, filtre, tri ; `/admin/carts?product=<id>` liste les paniers contenant un produit.
- Détail : prix, quantité face au stock, sous-total, disponibilité (disponible, stock insuffisant, rupture, archivé, supprimé), total ; un administrateur peut retirer un article ou vider (confirmation + journal). Même chose pour `/admin/wishlists`.
- **Contrat de données pour la boutique :** chaque ligne de panier porte `feed: "CART"` et `updatedAt`, chaque ligne de wishlist `feed: "WISHLIST"` et `addedAt`. L'index `byFeed` permet de lister toutes les lignes sans `Scan`.
- Après une mise à jour du modèle, `pnpm db:create` (ou `-- --aws`) ajoute les index manquants aux tables existantes.

## Tableau de bord et activité

- `/admin` : période 7 / 30 / 90 jours dans l'URL ; 7 indicateurs du jour (utilisateurs, produits, catégories, articles en panier et en wishlist, ruptures, stock faible) comparés à l'état d'il y a N jours, et 5 mouvements de la période (nouveaux clients et produits, ajouts au panier et en wishlist, actions des admins) comparés à la période précédente. Chaque carte mène à la liste filtrée.
- Graphiques (Recharts, chargés dans le navigateur) : nouveaux clients par jour, produits par catégorie, produits les plus mis en wishlist ; chacun a sa table « Voir les données ». Widgets : alertes de stock, activité récente, derniers produits et clients.
- Chaque bloc se charge et échoue indépendamment (`Suspense` + `catchError`, bouton « Réessayer »).
- **Historique :** les totaux du jour sont copiés chaque nuit dans `Stats` (`SNAPSHOT#AAAA-MM-JJ`) par le cron Vercel `/api/cron/snapshot` (`vercel.json`, protégé par `CRON_SECRET`). Sans relevé à la date voulue, la carte affiche « Pas encore d'historique ».
- `/admin/activity` : journal complet, filtres période / élément / action / auteur, « Voir plus » par curseur, modifications détaillées champ par champ.
- Thème clair, sombre ou système dans le menu du compte.

## Authentification et rôles

- Connexion par email et mot de passe sur `/login` : hash scrypt, session stockée dans DynamoDB, cookie HttpOnly.
- Session : 12 h d'inactivité, 7 jours maximum. 5 échecs en 15 minutes bloquent l'email ou l'IP.
- Rôles : **Super administrateur** (tout), **Administrateur** (catalogue, utilisateurs, paniers), **Lecture seule**.
- Chaque page et action appelle `requireAdmin()` ([src/lib/auth/dal.ts](src/lib/auth/dal.ts)) ; `proxy.ts` ne fait qu'une redirection rapide.
- Pas d'inscription publique : les comptes sont créés avec `pnpm admin:create`.

Mise en production sur AWS : [docs/deploiement-aws.md](docs/deploiement-aws.md).

## Structure

```text
src/
├── app/            routes (App Router)
├── components/     ui/ (primitives Radix), admin/ (layout), feedback/
├── features/       logique par domaine (auth, users…)
├── lib/            env, erreurs, auth, audit, client DynamoDB
└── proxy.ts        redirection des visiteurs sans session
scripts/            tables, seed, comptes admin, base de test
docs/               specs, plans, guide de déploiement AWS
tests/e2e/          tests Playwright
```

## Note Windows

`pnpm-workspace.yaml` utilise `nodeLinker: hoisted` : la disposition isolée de pnpm provoquait des erreurs `EPERM` lors du renommage de paquets natifs sous Windows.
