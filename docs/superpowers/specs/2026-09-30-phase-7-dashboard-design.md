# Phase 7 — Tableau de bord, images, notifications : design

**Date :** 2026-09-30
**Statut :** validé en discussion
**Roadmap :** [ROADMAP.md](../../../ROADMAP.md) § 8, § 14, § 25 et § 20 (Phase 7)

Livrée en trois PR successives : **7a** (tableau de bord, comparaisons, activité, mode sombre), **7b** (images S3), **7c** (notifications).

---

## 7a — Tableau de bord, comparaison, activité, mode sombre

### Tableau de bord `/admin`

- **Période** : `?period=7|30|90` (défaut 30), sélecteur en tête de page.
- **7 compteurs** lus en un `GetItem` sur `Stats GLOBAL` : utilisateurs, produits, catégories, articles en panier, en wishlist, ruptures, stock faible. Chaque carte est un lien vers la liste filtrée correspondante.
- **Comparaison des totaux** : valeur actuelle vs instantané de `aujourd'hui − période` (`Stats SNAPSHOT#YYYY-MM-DD`) ; « pas encore d'historique » si l'instantané n'existe pas.
- **Indicateurs de mouvement** (calculés depuis les dates, comparés à la période précédente de même durée) : nouveaux clients (`Users.createdAt`, rôle client), nouveaux produits (`Products.createdAt`), articles ajoutés aux paniers (`Carts.addedAt`), ajouts en wishlist (`Wishlists.addedAt`), actions d'administration (`AuditLogs` par date).
- **Évolution** : `delta = courant − précédent` ; `pourcentage = delta / précédent` (absent si précédent = 0) ; libellé « +12 % par rapport aux 30 jours précédents » ; sens indiqué par signe, icône et texte, jamais par la seule couleur.
- **Widgets indépendants** (chacun dans son `Suspense` + limite d'erreur avec « Réessayer ») : alertes de stock (8 plus bas, ruptures d'abord), 5 derniers inscrits, 5 derniers produits, 8 dernières actions.
- **Graphiques** (Recharts, chargés dynamiquement) : produits par catégorie principale (barres), nouveaux clients par jour sur la période (barres), 5 produits les plus souhaités (barres horizontales). Couleurs issues des jetons CSS ; alternative textuelle (tableau masqué) pour chaque graphique.

### Instantané quotidien

- Route `GET /api/cron/snapshot` protégée par `Authorization: Bearer ${CRON_SECRET}` ; copie `Stats GLOBAL` vers `Stats SNAPSHOT#<date UTC>` (écriture idempotente). Déclenchée chaque jour à 00:05 UTC par Vercel Cron (`vercel.json`).
- Variable `CRON_SECRET` (production). Permission IAM inchangée (`PutItem` sur `tynoc-*`).

### Journal `/admin/activity`

- Lecture via `AuditLogs.byFeed` (`feed = "LOG"`, tri décroissant sur `createdAt`), borne basse selon la période (`7 | 30 | 90` jours).
- Filtres : type d'entité, action, auteur (email) — appliqués côté DynamoDB (`FilterExpression`).
- Pagination par curseur « Voir plus » : `LastEvaluatedKey` encodé en base64url, décodé et validé par Zod à la réception. Non signé : le lecteur a déjà accès à tout le journal.
- Chaque entrée : action, résumé, auteur, date, lien vers l'objet ; dépliable pour afficher `changes` (avant → après).

### Mode sombre

- `next-themes` (attribut `class`), choix Clair / Sombre / Système dans le menu du compte, mémorisé dans le navigateur, script anti-flash.
- Jetons sombres existants ; vérification du contraste texte ≥ 4,5:1.

### Tests 7a

| Niveau      | Cas                                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitaires   | évolution (delta, pourcentage, précédent nul) ; bornes de périodes ; regroupement par jour ; top 5 ; curseur (aller-retour, valeur invalide) ; liens des cartes |
| Intégration | indicateurs de mouvement sur données datées ; instantané idempotent ; journal filtré et paginé                                                                  |
| E2E         | compteurs et widgets visibles ; clic « Ruptures » → liste filtrée ; changement de période ; filtre du journal ; mode sombre conservé après rechargement         |

---

## 7b — Images produits (S3)

- Bucket `tynoc-dashboard-images-<compte>` (eu-west-3). Politique : lecture publique de `products/*` uniquement ; écriture par URL présignée POST (types `image/jpeg|png|webp`, 5 Mo max, contrôlés par S3).
- Clé : `products/<productId>/<uuid>.<ext>` ; `Product.imageKeys` (8 max, la première est l'image principale).
- Fiche produit : galerie (ajout avec aperçu et progression, image principale, suppression avec effacement S3, réordonnancement). Miniatures dans listes, cartes, paniers, wishlists via `next/image`.
- Local et E2E : RustFS (Docker, compatible S3 ; MinIO n'est plus publié) ; bucket créé par les scripts. Variables : `S3_BUCKET`, `S3_ENDPOINT` (local), `S3_PUBLIC_URL`.
- Rôle IAM de production : `s3:PutObject`, `s3:DeleteObject` sur `arn:aws:s3:::<bucket>/products/*`.

## 7c — Notifications

- Table `Notifications` (TTL 30 jours) : `{ id, type, title, body, href, severity, createdAt, actorId? }`, index `byFeed` (`feed = "NOTIF"`, `createdAt`).
- Événements : produit en rupture ou en stock faible ; suppression de produit, anonymisation, changement de rôle par un autre admin ; création d'administrateur ; email bloqué par l'anti force brute.
- Lecture : Route Handler `GET /api/notifications?since=` ; l'interface interroge toutes les 15 s et au retour sur l'onglet ; toast pour `severity = important`.
- Lu / non-lu par administrateur : `Users.notificationsReadAt` ; « Tout marquer comme lu ».
