# Phase 5 — Utilisateurs : plan d'implémentation

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans).

**Spec :** [docs/superpowers/specs/2026-09-30-phase-5-users-design.md](../specs/2026-09-30-phase-5-users-design.md)

Contraintes : celles des phases 3–4 (TDD, `requireAdmin` en tête d'action, transactions + audit, CI locale verte avant push).

### Tâche 1 : domaine utilisateurs (pur)

**Fichiers :** `src/features/users/{types,schemas,policy,list,temp-password}.ts` (+ tests), `src/lib/format.ts` (`maskEmail`)

- [ ] `userUpdateSchema`, `adminCreateSchema`, `roleChangeSchema`, `passwordChangeSchema`, `userListQuerySchema` ; `canManageUser` ; `generateTemporaryPassword` ; `filterSortPaginateUsers` ; commit `feat(users): add user domain rules`.

### Tâche 2 : service utilisateurs

**Fichiers :** `src/features/users/{repository,service}.ts` (+ `service.int.test.ts`), `src/lib/auth/session*.ts`

- [ ] Liste, fiche, modification, suspension, rôle, création d'admin, réinitialisation, changement de mot de passe, anonymisation ; `mustChangePassword` dans la session ; commit `feat(users): add user management service`.

### Tâche 3 : changement de mot de passe

**Fichiers :** `src/app/compte/mot-de-passe/page.tsx`, `src/features/auth/…`, `src/lib/auth/dal.ts`, menu du compte

- [ ] Redirection obligatoire, formulaire, entrée du menu ; commit `feat(auth): add password change and forced first-login change`.

### Tâche 4 : interface utilisateurs

**Fichiers :** `src/app/admin/users/**`, `src/features/users/{actions.ts,components/*}`

- [ ] Liste, fiche, dialogues (modifier, rôle, mot de passe temporaire, création d'admin), confirmations ; commit `feat(users): add user management screens`.

### Tâche 5 : démo, E2E, documentation

- [ ] Clients de démonstration, `tests/e2e/users.spec.ts`, README ; commit `test(users): add user management end-to-end journeys` ; PR « Phase 5 — Utilisateurs ».
