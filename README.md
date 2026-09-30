# Tynoc Admin

Tableau de bord d'administration e-commerce : catalogue, stocks, catégories, clients, paniers, wishlists, journal d'activité et notifications.

- **Site en ligne :** <https://tynoc-dashboard.vercel.app>
- **Compte de démonstration** (lecture seule) : `demo@tynoc.fr` / `Demo-Tynoc-2026!`

Le compte de démonstration peut tout consulter mais rien modifier. Les données sont fictives, les adresses email lui sont masquées et son mot de passe ne peut pas être changé.

![Tableau de bord](docs/captures/02-tableau-de-bord.jpg)

## Sommaire

1. [Captures](#captures)
2. [Fonctionnalités](#fonctionnalités)
3. [Stack et choix techniques](#stack-et-choix-techniques)
4. [Architecture](#architecture)
5. [Modèle DynamoDB](#modèle-dynamodb)
6. [Installation locale](#installation-locale)
7. [Variables d'environnement](#variables-denvironnement)
8. [Scripts](#scripts)
9. [Authentification et rôles](#authentification-et-rôles)
10. [Tests](#tests)
11. [Déploiement](#déploiement)
12. [Sécurité](#sécurité)
13. [Limites connues](#limites-connues)
14. [Améliorations futures](#améliorations-futures)
15. [Auteur](#auteur)

## Captures

|                                                                                                  |                                                                                                 |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| ![Connexion](docs/captures/01-connexion.jpg) Connexion                                           | ![Tableau de bord mobile](docs/captures/03-tableau-de-bord-mobile.jpg) Tableau de bord (mobile) |
| ![Produits](docs/captures/04-produits.jpg) Liste des produits                                    | ![Formulaire produit](docs/captures/05-formulaire-produit.jpg) Formulaire produit               |
| ![Fiche produit](docs/captures/06-fiche-produit.jpg) Fiche produit et galerie                    | ![Ajustement de stock](docs/captures/07-ajustement-stock.jpg) Ajustement de stock               |
| ![Catégories](docs/captures/08-categories.jpg) Catégories                                        | ![Utilisateurs](docs/captures/09-utilisateurs.jpg) Utilisateurs                                 |
| ![Détail utilisateur](docs/captures/10-detail-utilisateur.jpg) Détail utilisateur                | ![Détail panier](docs/captures/11-detail-panier.jpg) Détail panier                              |
| ![Détail wishlist](docs/captures/12-detail-wishlist.jpg) Détail wishlist                         | ![Journal d'activité](docs/captures/13-activite.jpg) Journal d'activité                         |
| ![Dialogue de confirmation](docs/captures/14-dialogue-confirmation.jpg) Dialogue de confirmation | ![État vide](docs/captures/15-etat-vide.jpg) Aucun résultat                                     |
| ![Notifications](docs/captures/16-notifications.jpg) Notifications                               | ![Mode sombre](docs/captures/17-mode-sombre.jpg) Mode sombre                                    |

## Fonctionnalités

**Tableau de bord** (`/admin`)

- Période 7 / 30 / 90 jours dans l'URL ; 7 indicateurs du jour comparés à l'état d'il y a N jours, 5 mouvements de la période comparés à la période précédente ; chaque carte mène à la liste filtrée.
- Graphiques (nouveaux clients par jour, produits par catégorie, produits les plus mis en wishlist), chacun avec sa table « Voir les données » ; widgets d'alertes de stock, d'activité récente, de derniers produits et clients (5 lignes).
- Chaque bloc se charge et échoue indépendamment (`Suspense` + `catchError`, bouton « Réessayer »).
- Historique : un cron Vercel copie chaque nuit les totaux du jour (`Stats`, `SNAPSHOT#AAAA-MM-JJ`).

**Produits** (`/admin/products`)

- Recherche nom / SKU sans tenir compte des accents, filtres statut / catégorie / niveau de stock, 8 tris, pagination ; filtres dans l'URL.
- Création, modification, ajustement de stock avec raison, archivage et restauration, suppression définitive (super administrateur, refusée si le produit est dans un panier ou une wishlist).
- Galerie de 8 images (JPEG, PNG, WebP, 5 Mo) envoyées directement du navigateur à S3, image principale, ordre, suppression ; miniatures partout.

**Catégories** (`/admin/categories`) : un niveau de sous-catégories, activation, suppression refusée tant qu'il reste des produits ou des sous-catégories.

**Utilisateurs** (`/admin/users`) : clients et administrateurs, suspension, changement de rôle, réinitialisation du mot de passe (temporaire, à remplacer à la connexion), anonymisation RGPD ; le dernier super administrateur actif est protégé et personne n'agit sur son propre compte.

**Paniers et wishlists** : valeur estimée au prix actuel, disponibilité de chaque ligne, paniers abandonnés (7 jours), retrait d'un article ou vidage avec confirmation.

**Journal d'activité** (`/admin/activity`) : chaque écriture est journalisée dans la même transaction ; filtres, « Voir plus », modifications champ par champ.

**Notifications** : cloche avec badge, rafraîchie toutes les 15 s ; stock qui se dégrade, actions sensibles d'un autre administrateur, connexion bloquée après 5 échecs ; toasts pour les notifications importantes.

**Interface** : responsive dès 375 px, utilisable au clavier, thème clair / sombre / système, menus déroulants et dialogues accessibles (Radix), états de chargement, vide, aucun résultat et erreur sur chaque page.

## Stack et choix techniques

| Choix                                                          | Pourquoi                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Next.js 16** (App Router, Server Components, Server Actions) | Données lues et écrites côté serveur (une seule route API : le fil des notifications) ; streaming des widgets.      |
| **React 19**, **TypeScript** strict                            | `useActionState`, `useOptimistic`, `useEffectEvent` ; types stricts (`noUncheckedIndexedAccess`).                   |
| **Tailwind CSS v4** + jetons de couleur                        | Thèmes clair et sombre à partir des mêmes jetons ; contrastes vérifiés (WCAG AA).                                   |
| **Radix UI**                                                   | Dialogues, menus, listes déroulantes et popovers accessibles sans réécrire leur comportement.                       |
| **DynamoDB** (plusieurs tables, index secondaires)             | Serverless comme Vercel, coût nul au repos ; chaque écran correspond à un accès par clé ou index, jamais de `Scan`. |
| **S3** + POST présigné                                         | Les images ne transitent pas par les fonctions Vercel ; S3 impose type et taille.                                   |
| **Vercel** + **OIDC AWS**                                      | Aucune clé AWS stockée : Vercel assume un rôle IAM à droits minimaux.                                               |
| **Recharts**                                                   | Graphiques React chargés uniquement dans le navigateur.                                                             |
| **Vitest** + **Playwright** + **axe**                          | Tests unitaires, intégration sur DynamoDB Local et RustFS, E2E desktop et mobile, accessibilité.                    |

Les décisions détaillées (et leurs alternatives) sont dans [ROADMAP.md](ROADMAP.md) et [docs/superpowers/](docs/superpowers/).

## Architecture

```mermaid
flowchart LR
  B[Navigateur] -- pages, Server Actions --> V[Next.js sur Vercel]
  B -- POST présigné<br/>images --> S3[(S3<br/>products/*)]
  B -. lecture publique .-> S3
  V -- rôle IAM via OIDC --> D[(DynamoDB<br/>11 tables)]
  V -- signe les envois,<br/>efface les fichiers --> S3
  C[Vercel Cron] -- relevé quotidien,<br/>nettoyage hebdomadaire --> V
```

- `src/proxy.ts` redirige les visiteurs sans cookie ; la vraie vérification est `requireAdmin()` ([src/lib/auth/dal.ts](src/lib/auth/dal.ts)), appelée par chaque page, action et route.
- Chaque mutation écrit l'objet, les compteurs du tableau de bord, le journal d'activité et, le cas échéant, une notification **dans une seule transaction** DynamoDB, avec verrouillage optimiste (`version`).

```text
src/
├── app/            routes (App Router) et routes API (cron, notifications)
├── components/     ui/ (primitives Radix), admin/ (layout), feedback/
├── features/       logique par domaine : products, categories, users, carts,
│                   dashboard, activity, notifications, auth
├── lib/            env, erreurs, auth, audit, AWS (DynamoDB, S3), en-têtes
└── proxy.ts        redirection des visiteurs sans session
scripts/            tables, bucket, seed, comptes admin, base de test, CI locale
docs/               specs, plans, déploiement AWS, captures
tests/e2e/          tests Playwright
```

## Modèle DynamoDB

| Table           | Clé                    | Index secondaires                                                                          | Accès principaux                                                   |
| --------------- | ---------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `Products`      | `id`                   | `byStatus` (status, nameNormalized) · `byCategory` (categoryId, createdAt) · `bySku` (sku) | liste par statut, produits d'une catégorie                         |
| `Categories`    | `id`                   | `bySlug` (slug) · `byParent` (parentId, sortOrder)                                         | arbre des catégories                                               |
| `Users`         | `id`                   | `byEmail` (email) · `byRole` (role, createdAt) · `byStatus` (status, createdAt)            | connexion, liste, auteurs du journal                               |
| `Carts`         | `userId` + `productId` | `byProduct` (productId, userId) · `byFeed` (feed, updatedAt)                               | panier d'un client, paniers contenant un produit, tous les paniers |
| `Wishlists`     | `userId` + `productId` | `byProduct` (productId, addedAt) · `byFeed` (feed, addedAt)                                | idem pour les wishlists                                            |
| `AuditLogs`     | `pk` + `sk`            | `byFeed` (feed, createdAt) · `byActor` (actorId, createdAt)                                | historique d'un objet, journal complet, actions d'un admin         |
| `Notifications` | `id`                   | `byFeed` (feed, createdAt)                                                                 | fil de la cloche ; TTL 30 jours                                    |
| `Stats`         | `pk`                   | —                                                                                          | compteurs (`GLOBAL`) et relevés quotidiens (`SNAPSHOT#date`)       |
| `Uniques`       | `pk`                   | —                                                                                          | unicité de l'email, du SKU, des slugs (réservée en transaction)    |
| `Sessions`      | `pk`                   | `byUser` (userId)                                                                          | sessions (jeton haché) ; TTL                                       |
| `RateLimits`    | `pk`                   | —                                                                                          | anti force brute par email et par IP ; TTL                         |

**Contrat de données pour la boutique :** chaque ligne de panier porte `feed: "CART"` et `updatedAt`, chaque ligne de wishlist `feed: "WISHLIST"` et `addedAt`. Après une évolution du modèle, `pnpm db:create` ajoute les tables et index manquants.

## Installation locale

Prérequis : Node.js 24, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env.local
pnpm db:up                # DynamoDB Local (port 8000) et S3 RustFS (port 9000)
pnpm db:create            # tables et bucket d'images (idempotent)
pnpm db:seed              # compteurs et catégories de départ
pnpm db:seed -- --demo    # facultatif : produits, clients, paniers et wishlists fictifs
pnpm admin:create         # premier super administrateur
pnpm dev                  # http://localhost:3000/login
```

En local, le stockage S3 est [RustFS](https://github.com/rustfs/rustfs) : les images Docker de MinIO ne sont plus publiées.

## Variables d'environnement

| Variable                | Défaut      | Rôle                                                         |
| ----------------------- | ----------- | ------------------------------------------------------------ |
| `AWS_REGION`            | `eu-west-3` | région AWS                                                   |
| `DYNAMODB_ENDPOINT`     | —           | `http://localhost:8000` en local, vide en production         |
| `DYNAMODB_TABLE_PREFIX` | `tynoc-`    | préfixe des noms de tables                                   |
| `S3_BUCKET`             | —           | bucket des images (sans lui, la galerie est désactivée)      |
| `S3_ENDPOINT`           | —           | `http://localhost:9000` en local, vide en production         |
| `S3_PUBLIC_URL`         | déduite     | URL publique des images (CDN), facultative                   |
| `AWS_ROLE_ARN`          | —           | production : rôle IAM assumé via Vercel OIDC                 |
| `CRON_SECRET`           | —           | production : secret des crons (16 caractères ou plus)        |
| `DEMO_ACCOUNT_EMAIL`    | —           | compte de démonstration public (mot de passe non modifiable) |

Les variables sont validées au démarrage par [src/lib/env.ts](src/lib/env.ts).

## Scripts

| Script                                           | Rôle                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`         | développement, build, serveur de production                                |
| `pnpm typecheck` · `pnpm lint` · `pnpm format`   | types, ESLint, Prettier                                                    |
| `pnpm test` · `pnpm test:unit` · `pnpm test:e2e` | unitaires + intégration, unitaires seuls, Playwright                       |
| `pnpm ci:local`                                  | CI complète en local (`--quick` : sans build ni E2E)                       |
| `pnpm db:up` / `db:down`                         | démarre / arrête DynamoDB Local et RustFS                                  |
| `pnpm db:create`                                 | tables, index manquants et bucket (`-- --aws --bucket <nom>` pour AWS)     |
| `pnpm db:seed`                                   | données de départ (`-- --demo`, sur AWS avec `--allow-demo-in-production`) |
| `pnpm db:test:reset`                             | recrée la base et le bucket de test                                        |
| `pnpm admin:create`                              | crée un administrateur ou réinitialise son mot de passe                    |

## Authentification et rôles

- Connexion par email et mot de passe : hachage scrypt, session en base (jeton aléatoire, seul son hash est stocké), cookie `HttpOnly`, `Secure`, `SameSite=Lax`. 12 h d'inactivité, 7 jours au maximum.
- 5 échecs en 15 minutes bloquent l'email ou l'IP ; le blocage d'un email notifie les administrateurs.
- Rôles : **Super administrateur** (tout), **Administrateur** (catalogue, utilisateurs, paniers), **Lecture seule** (consultation, emails masqués).
- Pas d'inscription publique : les comptes sont créés par `pnpm admin:create` ou par un super administrateur (mot de passe temporaire à remplacer).

## Tests

| Niveau        | Outil                                 | Portée                                                                                                                                |
| ------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Unitaires     | Vitest                                | règles métier pures (stock, prix, périodes, comparaisons, images, notifications, en-têtes, contrôle d'accès de chaque point d'entrée) |
| Intégration   | Vitest + DynamoDB Local + RustFS      | services : transactions, unicité, verrous de version, S3 présigné, notifications, crons                                               |
| E2E           | Playwright (desktop et mobile 375 px) | parcours complets par rôle, envoi d'images, notifications entre deux administrateurs                                                  |
| Accessibilité | axe (WCAG 2.2 AA)                     | toutes les pages, thèmes clair et sombre, desktop et mobile                                                                           |

GitHub Actions n'étant pas disponible sur ce compte, la CI tourne en local : `pnpm install` active le hook `pre-push`, qui exécute `pnpm ci:local` (format, types, lint, tests, build, E2E) avant chaque push. Tester un déploiement : `E2E_BASE_URL=https://tynoc-dashboard.vercel.app pnpm test:e2e`.

Lighthouse (build de production, desktop) : 100 en performance, accessibilité et bonnes pratiques sur la connexion et le tableau de bord.

## Déploiement

Vercel (branche `main` → production) avec DynamoDB et S3 en `eu-west-3`, accès par rôle IAM via OIDC. Étapes complètes : [docs/deploiement-aws.md](docs/deploiement-aws.md).

## Sécurité

- **Contrôle d'accès** : `requireAdmin(permission)` dans chaque page, Server Action et route ; un test lit tous les points d'entrée et échoue si l'un d'eux ne vérifie pas l'appelant.
- **Données** : validation Zod côté serveur, montants en centimes, unicité et verrous de version en transaction, aucun `Scan`.
- **IAM minimal** : le rôle Vercel n'a que des actions de données sur les tables `tynoc-*` et l'écriture S3 sous `products/*` ; il n'est assumable que par la production Vercel.
- **Images** : lecture publique de `products/*` uniquement ; type, taille et clé imposés par la signature S3.
- **En-têtes** : CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Secrets** : aucun dans le dépôt ni son historique (vérifié) ; crons protégés par secret partagé.
- **Vie privée** : emails masqués pour le rôle lecture seule (listes, journal, notifications), anonymisation RGPD.

## Limites connues

- La recherche produits filtre en mémoire après lecture de l'index `byStatus` : adapté à quelques milliers de produits.
- Notifications par interrogation toutes les 15 s, pas de temps réel strict.
- La CSP autorise les scripts en ligne (pas de nonce) : l'échappement de React reste la protection contre le XSS.
- Le compte de démonstration peut être bloqué 15 minutes par 5 mauvais mots de passe.

## Améliorations futures

- Moteur de recherche (OpenSearch ou Meilisearch) au-delà de ~5 000 produits.
- CSP à nonce, via `proxy.ts` sur toutes les pages.
- Temps réel (WebSocket ou SSE) pour les notifications.
- Export CSV des listes, commandes et paiements quand la boutique existera.

## Auteur

Daniel Nagoloum Talla — conception et développement, avec Claude Code.
