# Phase 7b — Images produits (S3) : plan

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Spec :** [docs/superpowers/specs/2026-09-30-phase-7-dashboard-design.md](../specs/2026-09-30-phase-7-dashboard-design.md) (partie 7b)

Contraintes : TDD, `requireAdmin("products:write")`, CI locale avant chaque push ; dépendances via `pnpm add --lockfile-only` puis réinstallation propre.

Décisions :

- Envoi direct navigateur → S3 par **POST présigné** (conditions S3 : préfixe de clé exact, type `image/jpeg|png|webp`, 1 o à 5 Mo, 5 min) ; le serveur ne voit jamais le fichier.
- Rattachement ensuite par Server Action : clé sous `products/<id>/`, objet présent (`HeadObject`), 8 images max, verrou de version, entrée de journal dans la même transaction.
- Suppression : retrait de la clé (transaction) puis effacement S3 ; suppression définitive d'un produit → effacement de ses images après la transaction.
- Local / E2E : RustFS (Docker, port 9000 ; les images MinIO ne sont plus publiées) ; bucket, politique publique `products/*` et CORS créés par `pnpm db:create` / `db:test:reset`. `next/image` n'autorise les IP locales que si `S3_ENDPOINT` est défini.
- Limite connue : un fichier envoyé mais jamais rattaché (onglet fermé) reste dans S3 ; nettoyage à prévoir (phase 8).

### Tâche 1 : infrastructure

- [x] RustFS dans `docker-compose.yml`, variables `S3_BUCKET` / `S3_ENDPOINT` / `S3_PUBLIC_URL`, client S3 partagé, `scripts/lib/ensure-bucket.ts`, CI locale démarre MinIO, `next.config.ts` (`remotePatterns`) ; commit `feat(images): add S3 storage and local RustFS`.

### Tâche 2 : règles (pur)

- [x] `src/features/products/images.ts` : types acceptés, taille max, clé, URL publique, déplacement, image principale + tests ; commit `feat(images): add product image rules`.

### Tâche 3 : service

- [x] URL présignée, rattachement, suppression, réordonnancement, effacement à la suppression du produit + tests d'intégration (RustFS) ; commit `feat(images): add product image service`.

### Tâche 4 : interface

- [x] Galerie sur la fiche produit (aperçu, progression, principale, ordre, suppression), miniatures dans la liste produits, paniers, wishlists et le tableau de bord ; commit `feat(images): add product gallery and thumbnails`.

### Tâche 5 : production

- [ ] Bucket AWS, politique, CORS, droits du rôle Vercel, variables Vercel, `docs/deploiement-aws.md`.

### Tâche 6 : E2E, documentation, PR

- [ ] `tests/e2e/images.spec.ts`, README ; PR « Phase 7b — Images produits ».
