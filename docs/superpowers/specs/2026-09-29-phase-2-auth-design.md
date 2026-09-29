# Phase 2 — Authentification et rôles : design

**Date :** 2026-09-29
**Statut :** validé en discussion, en relecture
**Roadmap :** [ROADMAP.md](../../../ROADMAP.md) § 8 et § 20 (Phase 2)

## 1. Objectif

Réserver `/admin` aux administrateurs authentifiés, avec trois rôles (`SUPER_ADMIN`, `ADMIN`, `VIEWER`), une déconnexion immédiate possible et une protection contre la force brute. Fonctionne en local (DynamoDB Local) et en production (Vercel + DynamoDB AWS).

## 2. Décisions

| Sujet          | Décision                                                                             | Raison                                                                       |
| -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Approche       | Authentification maison suivant le guide officiel Next.js 16                         | Sessions révocables, pas d'adaptateur DynamoDB à écrire, code lisible        |
| Hash           | `crypto.scrypt` natif Node, sel aléatoire 16 octets, N=2^15, r=8, p=1, clé 64 octets | Aucune dépendance native (évite les soucis d'installation pnpm sous Windows) |
| Sessions       | En base (table `Sessions`) + cookie opaque                                           | Suspension / changement de rôle effectifs immédiatement                      |
| Production     | Compte AWS de l'utilisateur, Vercel → rôle IAM via OIDC                              | Aucune clé AWS stockée                                                       |
| Premier admin  | Commande `pnpm admin:create`                                                         | Pas d'inscription publique                                                   |
| Hors périmètre | 2FA, OAuth, reset par email, « se souvenir de moi »                                  | YAGNI                                                                        |

## 3. Données

### 3.1 `Users` (table existante)

Champs ajoutés : `passwordHash` (format `scrypt$N$r$p$selBase64$hashBase64`), `lastLoginAt`.

Seuls les comptes `role ∈ {VIEWER, ADMIN, SUPER_ADMIN}` **et** `status = ACTIVE` peuvent se connecter. Un compte `CUSTOMER`, suspendu ou inexistant reçoit le même message générique que pour un mauvais mot de passe : « Email ou mot de passe incorrect. »

L'email est normalisé (trim + minuscules) avant stockage et recherche. L'unicité est garantie par l'item `Uniques` `EMAIL#<email>` écrit dans la même transaction que la création.

### 3.2 `Sessions` (nouvelle table)

| Attribut                          | Contenu                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `pk`                              | `SHA-256(token)` en hex — le token brut n'est jamais stocké |
| `userId`, `role`, `email`, `name` | copie pour éviter une lecture `Users` par requête           |
| `createdAt`                       | ISO                                                         |
| `lastSeenAt`                      | ISO                                                         |
| `expiresAt`                       | epoch secondes, attribut TTL DynamoDB                       |
| `absoluteExpiresAt`               | epoch secondes : `createdAt + 7 jours`                      |

GSI `byUser` (`userId`) pour supprimer toutes les sessions d'un utilisateur.

Règles :

- inactivité : `expiresAt = maintenant + 12 h` ; renouvelé si la session est utilisée alors qu'il reste moins de 11 h (une écriture au plus par heure et par session) ;
- plafond : jamais au-delà de `absoluteExpiresAt` ;
- la lecture rejette aussi une session expirée pas encore purgée par le TTL (le TTL DynamoDB peut prendre jusqu'à 48 h).

### 3.3 `RateLimits` (nouvelle table)

| Attribut    | Contenu                                  |
| ----------- | ---------------------------------------- |
| `pk`        | `LOGIN#EMAIL#<email>` ou `LOGIN#IP#<ip>` |
| `count`     | nombre d'échecs dans la fenêtre          |
| `expiresAt` | epoch secondes, TTL, fin de fenêtre      |

Fenêtre fixe de 15 minutes, `ADD count :1` atomique. Blocage si `count ≥ 5` pour l'email **ou** pour l'IP. Un succès supprime le compteur email. Message : « Trop de tentatives. Réessayez dans quelques minutes. »

### 3.4 Audit

Chaque connexion réussie et chaque déconnexion écrivent un `AuditLog` (`action: LOGIN | LOGOUT`, `entityType: USER`, `feed: "LOG"`). Les échecs ne sont pas journalisés dans AuditLogs (ils le sont via le compteur de rate limit), pour ne pas stocker d'emails saisis au hasard.

## 4. Cookie

Nom `tynoc_session`, valeur : 32 octets aléatoires en base64url. Attributs : `HttpOnly`, `Secure` (sauf `http://localhost`), `SameSite=Lax`, `Path=/`, `Max-Age` aligné sur l'expiration d'inactivité.

## 5. Modules

| Fichier                                       | Responsabilité               | Interface                                                                                                     |
| --------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `src/lib/auth/password.ts`                    | hash et vérification         | `hashPassword(plain): Promise<string>`, `verifyPassword(plain, stored): Promise<boolean>`                     |
| `src/lib/auth/permissions.ts`                 | RBAC                         | `type AdminRole`, `type Permission`, `can(role, permission): boolean`, `isAdminRole(role): role is AdminRole` |
| `src/lib/auth/tokens.ts`                      | génération et hash de token  | `generateSessionToken(): string`, `hashToken(token): string`                                                  |
| `src/lib/auth/session-repository.ts`          | accès DynamoDB `Sessions`    | `createSession`, `findSession`, `touchSession`, `deleteSession`, `deleteUserSessions`                         |
| `src/lib/auth/session.ts`                     | cookie + règles d'expiration | `startSession(user)`, `readSession()`, `endSession()`                                                         |
| `src/lib/auth/dal.ts`                         | point de contrôle unique     | `getSession(): Promise<Session \| null>` (via `React.cache`), `requireAdmin(permission?): Promise<Session>`   |
| `src/lib/auth/rate-limit.ts`                  | anti force brute             | `checkLoginAllowed(email, ip)`, `recordLoginFailure(email, ip)`, `clearLoginFailures(email)`                  |
| `src/lib/auth/safe-redirect.ts`               | paramètre `next`             | `safeNextPath(value): string` — chemin interne commençant par `/admin`, sinon `/admin`                        |
| `src/features/users/repository.ts`            | accès `Users` utile à l'auth | `findUserByEmail`, `createAdminUser`, `setPassword`, `markLogin`                                              |
| `src/features/auth/actions.ts`                | Server Actions               | `login(state, formData)`, `logout()`                                                                          |
| `src/features/auth/components/login-form.tsx` | formulaire client            | `useActionState(login)`                                                                                       |
| `src/proxy.ts`                                | redirection UX sans cookie   | matcher `/admin/:path*`                                                                                       |
| `scripts/create-admin.ts`                     | création / reset d'un admin  | `pnpm admin:create` interactif                                                                                |

Permissions (§ 8.2 roadmap) :

```ts
SUPER_ADMIN: tout
ADMIN: read, products:write, categories:write, users:write, carts:write
VIEWER: read
```

`requireAdmin(permission = "read")` : pas de session valide → `redirect("/login")` (le paramètre `next` est ajouté par `proxy.ts`, seul à connaître l'URL demandée) ; permission refusée → `forbidden()`.

## 6. Flux

### 6.1 Connexion

1. `LoginSchema` Zod : email valide, mot de passe 1–200 caractères.
2. `checkLoginAllowed(email, ip)` → refus si bloqué.
3. `findUserByEmail(email)`.
4. `verifyPassword` exécuté **toujours**, contre un hash factice si l'utilisateur est absent (temps de réponse constant).
5. Échec (mauvais mot de passe, rôle `CUSTOMER`, statut ≠ `ACTIVE`, absent) → `recordLoginFailure`, message générique.
6. Succès → `clearLoginFailures(email)`, `startSession`, `markLogin`, audit `LOGIN`, `redirect(safeNextPath(next))`.

L'IP vient de l'en-tête `x-forwarded-for` (premier élément, fourni par Vercel) ; en local `127.0.0.1`.

### 6.2 Navigation protégée

- `proxy.ts` : pas de cookie `tynoc_session` sur `/admin/*` → redirection `/login?next=<chemin>`. Ne lit pas la base.
- `app/admin/layout.tsx` : `await requireAdmin()` ; transmet nom et rôle au menu du compte.
- Les futures Server Actions commencent toutes par `await requireAdmin("<permission>")`.
- `/login` avec une session valide → redirection `/admin`.

### 6.3 Déconnexion

Menu du compte (topbar) → `logout()` : `deleteSession`, suppression du cookie, audit `LOGOUT`, redirection `/login`.

### 6.4 Révocation

`deleteUserSessions(userId)` est fourni maintenant et sera appelé en Phase 5 lors d'une suspension ou d'un changement de rôle.

## 7. Interface

- `/login` : panneau latéral indigo encre (identité de la sidebar) sur desktop, colonne unique sur mobile. Titre « Connexion à l'administration », champs Email et Mot de passe, bouton « Se connecter » désactivé pendant l'envoi, erreurs sous les champs reliées par `aria-describedby`, message global dans une région `role="alert"`.
- Topbar : menu du compte (nom, rôle en clair, « Se déconnecter ») via Radix DropdownMenu.
- `app/forbidden.tsx` : « Accès refusé. Votre rôle ne permet pas cette action. » + lien vers le tableau de bord.

## 8. Configuration

- `next.config.ts` : `experimental.authInterrupts: true`.
- `.env.example` : aucune nouvelle variable obligatoire.
- `db:create` crée `Sessions` et `RateLimits`, puis active le TTL sur `expiresAt` pour ces deux tables.
- Production : procédure écrite dans `docs/deploiement-aws.md` — création des tables, fournisseur OIDC Vercel dans IAM, rôle avec politique limitée aux tables `tynoc-*` (actions `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `BatchGetItem`, `TransactWriteItems`, `ConditionCheckItem` sur les tables et leurs index), variables Vercel `AWS_ROLE_ARN` et `AWS_REGION`. Le client DynamoDB utilise `awsCredentialsProvider` de `@vercel/functions/oidc` quand `AWS_ROLE_ARN` est défini.

## 9. Erreurs

- Erreurs de validation : renvoyées dans l'état du formulaire, par champ.
- Erreurs inattendues (DynamoDB indisponible…) : message « Connexion impossible pour le moment. Réessayez. », détail uniquement dans les logs serveur.
- Aucune information ne distingue un email inconnu d'un mauvais mot de passe.

## 10. Tests

| Niveau                       | Cas                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitaires                    | hash puis vérification ; refus d'un mauvais mot de passe ; format de hash invalide → `false` ; `can()` pour chaque rôle ; `safeNextPath` (chemin externe, `//evil.com`, `/login`, valeur absente) ; calcul d'expiration (glissante, plafond 7 jours)        |
| Intégration (DynamoDB Local) | cycle création → lecture → renouvellement → suppression ; `deleteUserSessions` ; session expirée refusée ; blocage au 5ᵉ échec puis déblocage après succès ; login refusé pour `CUSTOMER` et `SUSPENDED`                                                    |
| E2E                          | `/admin` sans session → `/login?next=/admin` ; mauvais mot de passe → message ; connexion `SUPER_ADMIN` → tableau de bord ; déconnexion → `/login` ; `VIEWER` → page 403 sur une route réservée (page de test `/admin/settings` protégée par `users:write`) |

Les tests d'intégration et E2E utilisent le préfixe de tables `tynoc-test-`, créé et alimenté par un script de préparation. `pnpm ci:local` vérifie que DynamoDB Local répond et le démarre sinon.

## 11. Critères d'acceptation

- Aucune page `/admin` n'est rendue sans session valide, y compris en désactivant `proxy.ts`.
- Un `VIEWER` reçoit un 403 sur une action d'écriture.
- Supprimer la session en base déconnecte immédiatement l'utilisateur.
- 5 échecs en 15 minutes bloquent l'email ciblé.
- Aucun mot de passe, token ou hash n'apparaît dans les logs ni dans les réponses.
- Le site de production permet de se connecter avec l'admin créé par `pnpm admin:create`.
