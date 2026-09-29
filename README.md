# Tynoc Admin

Tableau de bord d'administration e-commerce : produits, catégories, utilisateurs, paniers et wishlists.

**Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, Radix UI, DynamoDB, Vitest, Playwright.

La feuille de route complète et les choix d'architecture sont dans [ROADMAP.md](ROADMAP.md).

## État d'avancement

- [x] Phase 1 — Squelette : outillage, CI, DynamoDB Local, layout responsive
- [x] Phase 2 — Authentification et rôles
- [ ] Phase 3 — Produits
- [ ] Phase 4 — Catégories
- [ ] Phase 5 — Utilisateurs
- [ ] Phase 6 — Paniers et wishlists
- [ ] Phase 7 — Dashboard et activité
- [ ] Phase 8 — Durcissement et livraison

## Installation locale

Prérequis : Node.js 24, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env.local
pnpm db:up        # démarre DynamoDB Local sur le port 8000
pnpm db:create    # crée les tables (idempotent)
pnpm db:seed      # données initiales
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

Les variables sont validées au démarrage par [src/lib/env.ts](src/lib/env.ts). Aucun secret AWS n'est committé ; en production l'accès passe par un rôle IAM (OIDC).

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
