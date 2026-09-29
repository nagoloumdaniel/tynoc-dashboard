# Tynoc Admin

Tableau de bord d'administration e-commerce : produits, catégories, utilisateurs, paniers et wishlists.

**Stack :** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4, Radix UI, DynamoDB, Vitest, Playwright.

La feuille de route complète et les choix d'architecture sont dans [ROADMAP.md](ROADMAP.md).

## État d'avancement

- [x] Phase 1 — Squelette : outillage, CI, DynamoDB Local, layout responsive
- [ ] Phase 2 — Authentification et rôles
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
pnpm dev          # http://localhost:3000
```

## Scripts

| Script              | Rôle                                               |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | serveur de développement                           |
| `pnpm build`        | build de production                                |
| `pnpm typecheck`    | génère les types de routes puis vérifie TypeScript |
| `pnpm lint`         | ESLint                                             |
| `pnpm format`       | Prettier (écriture)                                |
| `pnpm test`         | tests unitaires Vitest                             |
| `pnpm test:e2e`     | tests Playwright (desktop + mobile 375 px)         |
| `pnpm db:up`/`down` | démarre / arrête DynamoDB Local                    |
| `pnpm db:create`    | crée les tables DynamoDB Local                     |
| `pnpm db:seed`      | insère les données initiales                       |

## Variables d'environnement

| Variable                | Défaut      | Rôle                                                 |
| ----------------------- | ----------- | ---------------------------------------------------- |
| `AWS_REGION`            | `eu-west-3` | région AWS                                           |
| `DYNAMODB_ENDPOINT`     | —           | `http://localhost:8000` en local, vide en production |
| `DYNAMODB_TABLE_PREFIX` | `tynoc-`    | préfixe des noms de tables                           |

Les variables sont validées au démarrage par [src/lib/env.ts](src/lib/env.ts). Aucun secret AWS n'est committé ; en production l'accès passe par un rôle IAM (OIDC).

## Structure

```text
src/
├── app/            routes (App Router)
├── components/     ui/ (primitives Radix), admin/ (layout), feedback/
├── lib/            env, erreurs, client DynamoDB, utilitaires
scripts/            création des tables et seed DynamoDB Local
tests/e2e/          tests Playwright
```

## Note Windows

`pnpm-workspace.yaml` utilise `nodeLinker: hoisted` : la disposition isolée de pnpm provoquait des erreurs `EPERM` lors du renommage de paquets natifs sous Windows.
