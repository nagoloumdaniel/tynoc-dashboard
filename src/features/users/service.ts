import "server-only";
import {
  type AuditAction,
  auditOp,
  queryEntityActivity,
} from "@/lib/audit/audit-log";
import {
  type TaggedItem,
  transact,
  TransactionConditionError,
} from "@/lib/aws/transaction";
import type { AuthUser } from "@/features/auth/service";
import {
  adminCreated,
  roleChanged,
  userAnonymized,
} from "@/features/notifications/events";
import { notificationOp } from "@/features/notifications/repository";
import { isDemoAccount } from "@/lib/auth/demo";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { can, isAdminRole } from "@/lib/auth/permissions";
import type { Session } from "@/lib/auth/session";
import { deleteUserSessions } from "@/lib/auth/session-repository";
import { AppError, conflict, notFound } from "@/lib/errors";
import { filterSortPaginateUsers, type UserPage } from "./list";
import { canManageUser, type UserAction } from "./policy";
import {
  countActiveSuperAdmins,
  countUserItems,
  createUser,
  deleteUserItems,
  emailTaken,
  findUserById,
  putUserOp,
  queryUsersByStatus,
  releaseEmailOp,
  reserveEmailOp,
  usersCounterOp,
} from "./repository";
import type {
  AdminCreateInput,
  UserListQuery,
  UserUpdateInput,
} from "./schemas";
import { generateTemporaryPassword } from "./temp-password";
import type { UserRecord, UserRole, UserStatus } from "./types";

type Actor = Session;

const versionConflict = () =>
  conflict(
    "VERSION_CONFLICT",
    "Ce compte a été modifié par quelqu'un d'autre. Rechargez la page.",
  );

async function run(items: TaggedItem[]) {
  try {
    await transact(items);
  } catch (error) {
    if (error instanceof TransactionConditionError) {
      if (error.failedTags.includes("email")) throw emailTaken();
      if (error.failedTags.includes("user")) throw versionConflict();
    }
    throw error;
  }
}

function assertAllowed(actor: Actor, target: UserRecord, action: UserAction) {
  const result = canManageUser(actor, target, action);
  if (!result.ok) throw new AppError(result.code, 403, result.message);
}

/** Keeps at least one active super admin able to manage the others. */
async function assertNotLastSuperAdmin(target: UserRecord) {
  if (target.role !== "SUPER_ADMIN" || target.status !== "ACTIVE") return;
  if ((await countActiveSuperAdmins()) <= 1) {
    throw conflict(
      "LAST_SUPER_ADMIN",
      "Il doit rester au moins un super administrateur actif.",
    );
  }
}

async function loadForChange(id: string, expectedVersion: number) {
  const user = await findUserById(id);
  if (!user) {
    throw notFound("USER_NOT_FOUND", "Le compte demandé est introuvable.");
  }
  if (user.status === "DELETED") {
    throw conflict("USER_ANONYMIZED", "Ce compte a été anonymisé.");
  }
  if (user.version !== expectedVersion) throw versionConflict();
  return user;
}

function audit(
  actor: Pick<Actor, "userId" | "email">,
  action: AuditAction,
  user: UserRecord,
  summary: string,
  changes?: Record<string, { from: unknown; to: unknown }>,
) {
  return auditOp({
    actorId: actor.userId,
    actorEmail: actor.email,
    action,
    entityType: "USER",
    entityId: user.id,
    summary,
    changes,
  });
}

function nextVersion(
  user: UserRecord,
  changes: Partial<UserRecord>,
): UserRecord {
  return {
    ...user,
    ...changes,
    version: user.version + 1,
    updatedAt: new Date().toISOString(),
  };
}

// ---- Queries -----------------------------------------------------------------

export async function listUsers(query: UserListQuery): Promise<UserPage> {
  const statuses: UserStatus[] =
    query.status === "current" ? ["ACTIVE", "SUSPENDED"] : [query.status];
  const users = (await Promise.all(statuses.map(queryUsersByStatus))).flat();
  return filterSortPaginateUsers(users, query);
}

export async function getUserDetail(id: string) {
  const user = await findUserById(id);
  if (!user) return null;
  const [items, activity] = await Promise.all([
    countUserItems(id),
    queryEntityActivity("USER", id, 10),
  ]);
  return { user, ...items, activity };
}

// ---- Commands ----------------------------------------------------------------

export async function updateUser(
  actor: Actor,
  id: string,
  expectedVersion: number,
  input: UserUpdateInput,
): Promise<UserRecord> {
  const before = await loadForChange(id, expectedVersion);
  assertAllowed(actor, before, "edit");

  const after = nextVersion(before, input);
  const changes = Object.fromEntries(
    (["name", "email", "phone"] as const)
      .filter((field) => before[field] !== after[field])
      .map((field) => [
        field,
        { from: before[field] ?? null, to: after[field] ?? null },
      ]),
  );
  const emailOps =
    after.email === before.email
      ? []
      : [releaseEmailOp(before.email), reserveEmailOp(after.email, id)];

  await run([
    putUserOp(after, before.version),
    ...emailOps,
    audit(
      actor,
      "UPDATE",
      after,
      `Modification du compte de ${after.name}`,
      changes,
    ),
  ]);
  return after;
}

export async function setUserStatus(
  actor: Actor,
  id: string,
  expectedVersion: number,
  status: "ACTIVE" | "SUSPENDED",
): Promise<UserRecord> {
  const before = await loadForChange(id, expectedVersion);
  const suspending = status === "SUSPENDED";
  assertAllowed(actor, before, suspending ? "suspend" : "reactivate");
  if (before.status === status) {
    throw conflict(
      "STATUS_UNCHANGED",
      suspending ? "Ce compte est déjà suspendu." : "Ce compte est déjà actif.",
    );
  }
  if (suspending) await assertNotLastSuperAdmin(before);

  const after = nextVersion(before, { status });
  await run([
    putUserOp(after, before.version),
    audit(
      actor,
      suspending ? "SUSPEND" : "REACTIVATE",
      after,
      `${suspending ? "Suspension" : "Réactivation"} du compte de ${after.name}`,
    ),
  ]);
  // A suspended account is signed out everywhere, right away.
  if (suspending) await deleteUserSessions(id);
  return after;
}

export async function changeUserRole(
  actor: Actor,
  id: string,
  expectedVersion: number,
  role: UserRole,
): Promise<{ user: UserRecord; temporaryPassword?: string }> {
  const before = await loadForChange(id, expectedVersion);
  assertAllowed(actor, before, "changeRole");
  if (role === before.role) return { user: before };
  if (before.role === "SUPER_ADMIN") await assertNotLastSuperAdmin(before);

  // A customer promoted to the back office needs a password of their own.
  const temporaryPassword =
    isAdminRole(role) && !before.passwordHash
      ? generateTemporaryPassword()
      : undefined;
  const after = nextVersion(before, {
    role,
    ...(temporaryPassword && {
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    }),
  });

  await run([
    putUserOp(after, before.version),
    audit(actor, "ROLE_CHANGE", after, `Rôle de ${after.name} modifié`, {
      role: { from: before.role, to: role },
    }),
    notificationOp(roleChanged(actor, after, before.role, role)),
  ]);
  await deleteUserSessions(id);
  return { user: after, temporaryPassword };
}

export async function createAdmin(
  actor: Actor,
  input: AdminCreateInput,
): Promise<{ user: UserRecord; temporaryPassword: string }> {
  if (!can(actor.role, "admins:manage")) {
    throw new AppError(
      "FORBIDDEN",
      403,
      "Action réservée aux super administrateurs.",
    );
  }
  const temporaryPassword = generateTemporaryPassword();
  const user = await createUser(
    {
      ...input,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
    (created) => [
      audit(
        actor,
        "CREATE",
        created,
        `Création du compte administrateur de ${created.name}`,
        {
          role: { from: null, to: created.role },
        },
      ),
      notificationOp(adminCreated(actor, created)),
    ],
  );
  return { user, temporaryPassword };
}

export async function resetUserPassword(
  actor: Actor,
  id: string,
  expectedVersion: number,
): Promise<{ user: UserRecord; temporaryPassword: string }> {
  const before = await loadForChange(id, expectedVersion);
  assertAllowed(actor, before, "resetPassword");

  const temporaryPassword = generateTemporaryPassword();
  const after = nextVersion(before, {
    passwordHash: await hashPassword(temporaryPassword),
    mustChangePassword: true,
  });
  await run([
    putUserOp(after, before.version),
    audit(
      actor,
      "PASSWORD_RESET",
      after,
      `Mot de passe de ${after.name} réinitialisé`,
    ),
  ]);
  await deleteUserSessions(id);
  return { user: after, temporaryPassword };
}

/**
 * The signed-in admin replaces their own password. Every session of the
 * account is closed; the caller opens a fresh one for the current browser.
 */
export async function changeOwnPassword(
  session: Session,
  input: { current: string; next: string },
): Promise<AuthUser> {
  if (isDemoAccount(session.email)) {
    throw new AppError(
      "DEMO_ACCOUNT",
      403,
      "Le mot de passe du compte de démonstration ne peut pas être changé.",
    );
  }
  const before = await findUserById(session.userId);
  if (
    !before?.passwordHash ||
    before.status !== "ACTIVE" ||
    !isAdminRole(before.role)
  ) {
    throw new AppError("FORBIDDEN", 403, "Compte indisponible.");
  }
  if (!(await verifyPassword(input.current, before.passwordHash))) {
    throw new AppError("WRONG_PASSWORD", 400, "Mot de passe actuel incorrect.");
  }

  const { mustChangePassword: _flag, ...rest } = before;
  const after = nextVersion(rest, {
    passwordHash: await hashPassword(input.next),
  });
  await run([
    putUserOp(after, before.version),
    audit(session, "PASSWORD_CHANGE", after, "Changement de mot de passe"),
  ]);
  await deleteUserSessions(before.id);
  return {
    id: after.id,
    name: after.name,
    email: after.email,
    role: before.role,
  };
}

export async function anonymizeUser(
  actor: Actor,
  id: string,
  expectedVersion: number,
): Promise<void> {
  const before = await loadForChange(id, expectedVersion);
  assertAllowed(actor, before, "anonymize");
  await assertNotLastSuperAdmin(before);

  const now = new Date().toISOString();
  // Only non-identifying fields survive: history and counters stay coherent.
  const after: UserRecord = {
    id: before.id,
    name: "Utilisateur supprimé",
    email: `supprime-${before.id}@anonymise.invalid`,
    role: "CUSTOMER",
    status: "DELETED",
    createdAt: before.createdAt,
    updatedAt: now,
    anonymizedAt: now,
    version: before.version + 1,
  };

  await run([
    putUserOp(after, before.version),
    releaseEmailOp(before.email),
    usersCounterOp(-1),
    audit(actor, "ANONYMIZE", after, "Anonymisation du compte (RGPD)"),
    notificationOp(userAnonymized(actor, after)),
  ]);
  await Promise.all([deleteUserSessions(id), deleteUserItems(id)]);
}
