import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, table } from "@/lib/aws/dynamodb";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { Session } from "@/lib/auth/session";
import { newSessionTimes, nowInSeconds } from "@/lib/auth/session-policy";
import { createSession, findSession } from "@/lib/auth/session-repository";
import { generateSessionToken, hashToken } from "@/lib/auth/tokens";
import * as repository from "./repository";
import {
  anonymizeUser,
  changeOwnPassword,
  changeUserRole,
  createAdmin,
  getUserDetail,
  listUsers,
  resetUserPassword,
  setUserStatus,
  updateUser,
} from "./service";
import type { UserRole } from "./types";

// The test tables hold several super admins; the "last one" case is simulated.
vi.mock("./repository", async (importOriginal) => {
  const original = await importOriginal<typeof repository>();
  return {
    ...original,
    countActiveSuperAdmins: vi.fn(original.countActiveSuperAdmins),
  };
});

const superAdmin: Session = {
  userId: "usr_super",
  email: "super@example.com",
  name: "Super",
  role: "SUPER_ADMIN",
};
const admin: Session = {
  userId: "usr_admin",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN",
};

const email = () => `user.${randomUUID().slice(0, 8)}@exemple.fr`;

function account(role: UserRole = "CUSTOMER", password?: string) {
  return (async () =>
    repository.createUser({
      name: "Jeanne Martin",
      email: email(),
      role,
      passwordHash: password ? await hashPassword(password) : undefined,
    }))();
}

async function openSession(userId: string) {
  const pk = hashToken(generateSessionToken());
  const now = new Date().toISOString();
  await createSession({
    pk,
    userId,
    role: "ADMIN",
    email: "x@example.com",
    name: "X",
    createdAt: now,
    lastSeenAt: now,
    ...newSessionTimes(nowInSeconds()),
  });
  return pk;
}

beforeEach(() => {
  vi.mocked(repository.countActiveSuperAdmins).mockClear();
});

describe("user service", () => {
  it("updates a customer and frees the old email", async () => {
    const user = await account();
    const newEmail = email();

    const updated = await updateUser(admin, user.id, 1, {
      name: "Jeanne Dupont",
      email: newEmail,
      phone: "06 12 34 56 78",
    });

    expect(updated).toMatchObject({
      name: "Jeanne Dupont",
      email: newEmail,
      version: 2,
    });
    await expect(
      repository.createUser({
        name: "Autre",
        email: user.email,
        role: "CUSTOMER",
      }),
    ).resolves.toBeTruthy();
  });

  it("refuses an email already used by another account", async () => {
    const [first, second] = await Promise.all([account(), account()]);
    await expect(
      updateUser(admin, second.id, 1, {
        name: second.name,
        email: first.email,
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN", status: 409 });
  });

  it("stops an admin from changing an administrator", async () => {
    const other = await account("VIEWER", "Mot-de-passe-2026");
    await expect(
      setUserStatus(admin, other.id, 1, "SUSPENDED"),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("suspends an account and signs it out everywhere", async () => {
    const target = await account("ADMIN", "Mot-de-passe-2026");
    const session = await openSession(target.id);

    const suspended = await setUserStatus(
      superAdmin,
      target.id,
      1,
      "SUSPENDED",
    );

    expect(suspended.status).toBe("SUSPENDED");
    expect(await findSession(session)).toBeNull();
    await expect(
      setUserStatus(superAdmin, target.id, 2, "ACTIVE"),
    ).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("refuses actions on one's own account", async () => {
    const me = await account("SUPER_ADMIN", "Mot-de-passe-2026");
    const self: Session = { ...superAdmin, userId: me.id };
    await expect(
      setUserStatus(self, me.id, 1, "SUSPENDED"),
    ).rejects.toMatchObject({
      code: "FORBIDDEN_SELF",
    });
  });

  it("protects the last active super admin", async () => {
    const last = await account("SUPER_ADMIN", "Mot-de-passe-2026");
    vi.mocked(repository.countActiveSuperAdmins).mockResolvedValueOnce(1);
    await expect(
      changeUserRole(superAdmin, last.id, 1, "ADMIN"),
    ).rejects.toMatchObject({ code: "LAST_SUPER_ADMIN" });
  });

  it("gives a promoted customer a temporary password to change", async () => {
    const customer = await account();

    const { user, temporaryPassword } = await changeUserRole(
      superAdmin,
      customer.id,
      1,
      "VIEWER",
    );

    expect(user).toMatchObject({ role: "VIEWER", mustChangePassword: true });
    expect(temporaryPassword).toHaveLength(16);
    expect(await verifyPassword(temporaryPassword!, user.passwordHash!)).toBe(
      true,
    );
  });

  it("creates an administrator with a temporary password", async () => {
    const { user, temporaryPassword } = await createAdmin(superAdmin, {
      name: "Nouvel Admin",
      email: email(),
      role: "ADMIN",
    });
    expect(user).toMatchObject({ role: "ADMIN", mustChangePassword: true });
    expect(await verifyPassword(temporaryPassword, user.passwordHash!)).toBe(
      true,
    );

    await expect(
      createAdmin(admin, { name: "X", email: email(), role: "ADMIN" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("resets an administrator's password and closes their sessions", async () => {
    const target = await account("ADMIN", "Ancien-mot-de-passe");
    const session = await openSession(target.id);

    const { user, temporaryPassword } = await resetUserPassword(
      superAdmin,
      target.id,
      1,
    );

    expect(user.mustChangePassword).toBe(true);
    expect(await verifyPassword(temporaryPassword, user.passwordHash!)).toBe(
      true,
    );
    expect(await findSession(session)).toBeNull();
  });

  it("changes one's own password after checking the current one", async () => {
    const me = await account("ADMIN", "Mot-de-passe-actuel");
    const self: Session = { ...admin, userId: me.id };
    const otherSession = await openSession(me.id);

    await expect(
      changeOwnPassword(self, {
        current: "faux",
        next: "Nouveau-mot-de-passe",
      }),
    ).rejects.toMatchObject({ code: "WRONG_PASSWORD" });

    const authUser = await changeOwnPassword(self, {
      current: "Mot-de-passe-actuel",
      next: "Nouveau-mot-de-passe",
    });
    expect(authUser).toMatchObject({ id: me.id, role: "ADMIN" });
    expect(await findSession(otherSession)).toBeNull();

    const saved = (await getUserDetail(me.id))!.user;
    expect(saved.mustChangePassword).toBeUndefined();
    expect(
      await verifyPassword("Nouveau-mot-de-passe", saved.passwordHash!),
    ).toBe(true);
  });

  it("anonymises an account, empties its cart and frees its email", async () => {
    const user = await account();
    await db().send(
      new PutCommand({
        TableName: table("Carts"),
        Item: { userId: user.id, productId: "prd_x", quantity: 2 },
      }),
    );
    expect((await getUserDetail(user.id))?.cartItems).toBe(1);

    await anonymizeUser(superAdmin, user.id, 1);

    const detail = await getUserDetail(user.id);
    expect(detail?.user).toMatchObject({
      name: "Utilisateur supprimé",
      email: `supprime-${user.id}@anonymise.invalid`,
      status: "DELETED",
      role: "CUSTOMER",
    });
    expect(detail?.user.phone).toBeUndefined();
    expect(detail?.cartItems).toBe(0);
    expect(detail?.activity[0]?.action).toBe("ANONYMIZE");
    await expect(
      repository.createUser({
        name: "Nouveau",
        email: user.email,
        role: "CUSTOMER",
      }),
    ).resolves.toBeTruthy();
    await expect(anonymizeUser(superAdmin, user.id, 2)).rejects.toMatchObject({
      code: "USER_ANONYMIZED",
    });
  });

  it("lists accounts through the status index", async () => {
    const tag = randomUUID().slice(0, 8);
    const active = await repository.createUser({
      name: `Liste ${tag}`,
      email: `liste.${tag}@exemple.fr`,
      role: "CUSTOMER",
    });
    const page = await listUsers({
      q: tag,
      type: "customers",
      status: "current",
      sort: "name",
      page: 1,
    });
    expect(page.items.map((u) => u.id)).toEqual([active.id]);
  });
});
