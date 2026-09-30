# Phase 8 — Durcissement et livraison : plan

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Référence :** [ROADMAP.md](../../../ROADMAP.md) § Phase 8, § 21 (critères d'acceptation), § 22 (README attendu).

Contraintes : TDD, CI locale avant chaque push.

Décisions :

- **Compte de démo** : rôle `VIEWER` en production, identifiants publiés dans le README ; données fictives chargées en production (catalogue, clients, paniers, wishlists). Les emails restent masqués pour ce rôle. Le chargement de démo sur AWS exige un drapeau explicite en plus de `--aws`.
- **Images orphelines** (limite 7b) : cron hebdomadaire qui efface les fichiers `products/` de plus de 24 h qu'aucun produit ne référence.
- **En-têtes HTTP** : CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

### Tâche 1 : sécurité

- [x] Test qui vérifie que chaque Server Action et Route Handler appelle son contrôle d'accès ; en-têtes de sécurité (+ test E2E) ; recherche de secrets dans le dépôt et l'historique ; revue IAM ; commit `feat(security): add security headers and access checks`.

### Tâche 2 : accessibilité et performance

- [x] `@axe-core/playwright` sur toutes les pages (desktop, mobile, sombre), corrections ; Lighthouse sur la prod ; commit `test(a11y): check every page with axe`.

### Tâche 3 : images orphelines

- [x] Règle pure (orphelines et ancienneté) + tests, route cron protégée, `vercel.json`, droit `s3:ListBucket` limité à `products/` ; commit `feat(images): clean up orphan uploads weekly`.

### Tâche 4 : démo en production

- [ ] Drapeau de démo sur AWS, compte `VIEWER` de démo, chargement en prod, vérification ; commit `feat(demo): allow demo data in production on request`.

### Tâche 5 : README et captures

- [ ] Captures (liste du § 22) dans `docs/captures/`, README complet (lien live, compte de démo, architecture, modèle DynamoDB, sécurité, limites, améliorations) ; PR « Phase 8 — Durcissement et livraison ».
