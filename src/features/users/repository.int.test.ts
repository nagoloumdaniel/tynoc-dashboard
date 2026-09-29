import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import {
  createUser,
  findUserByEmail,
  findUserById,
  markLogin,
  normalizeEmail,
  setPassword,
} from "./repository";

const uniqueEmail = () => `User.${randomUUID()}@Example.com`;

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toBe(
      "jane.doe@example.com",
    );
  });
});

describe("user repository", () => {
  it("creates a user found by email regardless of case", async () => {
    const email = uniqueEmail();
    const created = await createUser({
      name: "Jane",
      email,
      role: "ADMIN",
      passwordHash: "hash",
    });

    expect(created.id).toMatch(/^usr_/);
    expect(created.email).toBe(normalizeEmail(email));
    expect(created.status).toBe("ACTIVE");
    expect(created.version).toBe(1);

    const found = await findUserByEmail(email.toUpperCase());
    expect(found?.id).toBe(created.id);
    expect(await findUserById(created.id)).toEqual(created);
  });

  it("returns null for an unknown email", async () => {
    expect(await findUserByEmail(uniqueEmail())).toBeNull();
  });

  it("refuses a duplicate email", async () => {
    const email = uniqueEmail();
    await createUser({ name: "A", email, role: "VIEWER" });

    const duplicate = createUser({ name: "B", email, role: "VIEWER" });
    await expect(duplicate).rejects.toBeInstanceOf(AppError);
    await expect(duplicate).rejects.toMatchObject({
      code: "EMAIL_TAKEN",
      status: 409,
    });
  });

  it("changes the password and bumps the version", async () => {
    const user = await createUser({
      name: "C",
      email: uniqueEmail(),
      role: "ADMIN",
      passwordHash: "old",
    });

    await setPassword(user.id, "new");

    const updated = await findUserById(user.id);
    expect(updated?.passwordHash).toBe("new");
    expect(updated?.version).toBe(2);
  });

  it("records the last login", async () => {
    const user = await createUser({
      name: "D",
      email: uniqueEmail(),
      role: "ADMIN",
    });
    const at = new Date().toISOString();

    await markLogin(user.id, at);

    expect((await findUserById(user.id))?.lastLoginAt).toBe(at);
  });
});
