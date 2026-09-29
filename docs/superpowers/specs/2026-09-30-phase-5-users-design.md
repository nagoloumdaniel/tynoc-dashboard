# Phase 5 — Utilisateurs : design

**Date :** 2026-09-30
**Statut :** validé en discussion
**Roadmap :** [ROADMAP.md](../../../ROADMAP.md) § 11 et § 20 (Phase 5)

## 1. Objectif

Consulter et gérer les comptes (clients et administrateurs) : liste, fiche, modification, suspension, rôles, création d'administrateurs avec mot de passe temporaire, changement de mot de passe, anonymisation RGPD.

## 2. Modèle

`UserRecord` (phase 2) + `phone?: string`, `mustChangePassword?: boolean`, `anonymizedAt?: string`. La session (`SessionRecord`) copie `mustChangePassword`.

## 3. Permissions

Nouvelle fonction pure `canManageUser(actor, target, action)` :

| Action                          | Cible client                       | Cible administrateur |
| ------------------------------- | ---------------------------------- | -------------------- |
| `edit`, `suspend`, `reactivate` | `users:write` (ADMIN, SUPER_ADMIN) | SUPER_ADMIN          |
| `changeRole`, `resetPassword`   | SUPER_ADMIN                        | SUPER_ADMIN          |
| `anonymize`                     | SUPER_ADMIN                        | SUPER_ADMIN          |
| création d'administrateur       | SUPER_ADMIN (`admins:manage`)      | —                    |

Interdits dans tous les cas (erreur `FORBIDDEN_SELF` / `LAST_SUPER_ADMIN`) :

- sur soi-même : suspendre, changer de rôle, anonymiser ;
- rétrograder, suspendre ou anonymiser le dernier `SUPER_ADMIN` actif (vérifié par `Query Users byRole = SUPER_ADMIN` filtré sur `status = ACTIVE`).

Les `VIEWER` voient les emails masqués (`j•••@exemple.fr`).

## 4. Règles

- **Modification** (nom 2–80, email valide unique, téléphone facultatif `^[+0-9 ().-]{6,20}$`) : changement d'email → libère `EMAIL#ancien`, réserve `EMAIL#nouveau` dans la transaction (`EMAIL_TAKEN`). Verrouillage optimiste par `version`.
- **Suspension / réactivation** : `status ACTIVE ↔ SUSPENDED` ; suspension → `deleteUserSessions`.
- **Changement de rôle** : vers un rôle admin sans mot de passe existant (client promu) → mot de passe temporaire généré et renvoyé une fois, `mustChangePassword: true` ; toute modification de rôle → `deleteUserSessions`.
- **Création d'administrateur** : nom, email, rôle `VIEWER | ADMIN | SUPER_ADMIN` ; mot de passe temporaire (16 caractères, alphabet sans caractères ambigus) renvoyé une fois ; `mustChangePassword: true`.
- **Réinitialisation du mot de passe** (administrateurs) : nouveau mot de passe temporaire, `mustChangePassword: true`, sessions fermées.
- **Changement de mot de passe** (tout administrateur connecté) : mot de passe actuel requis (`WRONG_PASSWORD`), nouveau ≥ 12 caractères et différent de l'actuel, confirmation identique ; `mustChangePassword` retiré ; toutes les autres sessions fermées, la session courante mise à jour.
- **Anonymisation** : `name = "Utilisateur supprimé"`, `email = supprime-<id>@anonymise.invalid`, `phone` et `passwordHash` supprimés, `role = CUSTOMER`, `status = DELETED`, `anonymizedAt` ; libère `EMAIL#…` ; `Stats totalUsers −1` ; sessions fermées ; panier et wishlist vidés. Refusée si déjà anonymisé.
- **Audit** (`entityType: USER`) : `UPDATE`, `SUSPEND`, `REACTIVATE`, `ROLE_CHANGE`, `CREATE`, `PASSWORD_RESET`, `PASSWORD_CHANGE`, `ANONYMIZE`. Jamais de mot de passe, hash ni email complet d'un compte anonymisé dans les `changes`.

## 5. Lecture

- Liste : `Query Users byStatus` pour chaque statut demandé (projection des champs de liste), puis recherche (nom, email, sans accents), filtres type (`all | customers | admins`) et statut (`current` = ACTIVE + SUSPENDED, `ACTIVE`, `SUSPENDED`, `DELETED`), tri (`-createdAt`, `createdAt`, `name`), 20 par page.
- Fiche : utilisateur, nombre d'articles panier (`Query Carts userId`) et wishlist, 10 dernières entrées d'audit `USER#<id>`.

## 6. Mot de passe obligatoire

- `requireAdmin()` : si `session.mustChangePassword` → `redirect("/compte/mot-de-passe")`.
- `/compte/mot-de-passe` : hors du layout admin, protégé par `getSession()` (sinon `/login`) ; formulaire mot de passe actuel / nouveau / confirmation ; texte adapté si le changement est obligatoire.
- Menu du compte : « Changer mon mot de passe ».

## 7. Interface

- `/admin/users` : en-tête (+ « Ajouter un administrateur » si `admins:manage`), filtres, table (avatar initiales, nom, email, rôle, statut, inscription, dernière connexion), cartes mobiles, pagination, états.
- `/admin/users/[id]` : informations, rôle et statut, panier / wishlist (compteurs), historique ; actions selon `canManageUser` : Modifier (dialogue), Changer le rôle (dialogue), Suspendre / Réactiver (confirmation), Réinitialiser le mot de passe (confirmation), Anonymiser (confirmation avec saisie de l'email).
- Mot de passe temporaire : dialogue avec le mot de passe en police mono, bouton « Copier », avertissement « Il ne sera plus affiché ».

## 8. Données de démonstration

`pnpm db:seed -- --demo` ajoute ~30 clients fictifs (local uniquement).

## 9. Tests

| Niveau      | Cas                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unitaires   | schémas ; `maskEmail` ; `canManageUser` (matrice complète) ; génération de mot de passe temporaire (longueur, alphabet) ; filtre / tri / pagination                                                                                                                                                                                                                                        |
| Intégration | modification + email en double + ancien email libéré ; suspension ferme les sessions ; soi-même refusé ; dernier super admin protégé ; ADMIN refusé sur un admin ; promotion d'un client (mot de passe temporaire) ; création d'admin ; réinitialisation ; changement de mot de passe (actuel faux, autres sessions fermées) ; anonymisation (champs, compteur, panier vidé, email libéré) |
| E2E         | super admin crée un admin → connexion avec le mot de passe temporaire → changement forcé → tableau de bord ; admin suspend / réactive un client ; admin sans actions réservées sur un administrateur ; anonymisation ; lecteur avec emails masqués                                                                                                                                         |

## 10. Hors périmètre

Adresses, commandes, réinitialisation par email, import / export, avatars.
