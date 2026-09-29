import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth/password";
import { MAX_LOGIN_FAILURES } from "@/lib/auth/rate-limit";
import { createUser } from "@/features/users/repository";
import type { UserRole, UserStatus } from "@/features/users/types";
import { authenticate } from "./service";

const PASSWORD = "correct horse battery staple";
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

async function user(role: UserRole = "ADMIN", status: UserStatus = "ACTIVE") {
  return createUser({
    name: "Test",
    email: `${randomUUID()}@example.com`,
    role,
    status,
    passwordHash,
  });
}

const ip = () => `test-ip-${randomUUID()}`;

describe("authenticate", () => {
  it("accepts an active admin with the right password", async () => {
    const admin = await user("ADMIN");
    const result = await authenticate({
      email: admin.email.toUpperCase(),
      password: PASSWORD,
      ip: ip(),
    });
    expect(result).toEqual({
      ok: true,
      user: { id: admin.id, name: "Test", email: admin.email, role: "ADMIN" },
    });
  });

  it.each([
    ["a wrong password", "ADMIN", "ACTIVE", "wrong"],
    ["a customer account", "CUSTOMER", "ACTIVE", PASSWORD],
    ["a suspended admin", "ADMIN", "SUSPENDED", PASSWORD],
  ] as const)("refuses %s", async (_label, role, status, password) => {
    const account = await user(role, status);
    expect(
      await authenticate({ email: account.email, password, ip: ip() }),
    ).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("refuses an unknown email with the same answer", async () => {
    expect(
      await authenticate({
        email: `${randomUUID()}@example.com`,
        password: PASSWORD,
        ip: ip(),
      }),
    ).toEqual({ ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("blocks the account after 5 failures, even with the right password", async () => {
    const admin = await user();
    for (let i = 0; i < MAX_LOGIN_FAILURES; i++) {
      await authenticate({ email: admin.email, password: "wrong", ip: ip() });
    }
    expect(
      await authenticate({ email: admin.email, password: PASSWORD, ip: ip() }),
    ).toEqual({ ok: false, reason: "RATE_LIMITED" });
  });

  it("resets the failure count after a successful login", async () => {
    const admin = await user();
    const attempt = (password: string) =>
      authenticate({ email: admin.email, password, ip: ip() });

    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++) await attempt("wrong");
    expect((await attempt(PASSWORD)).ok).toBe(true);
    for (let i = 0; i < MAX_LOGIN_FAILURES - 1; i++) await attempt("wrong");
    expect((await attempt(PASSWORD)).ok).toBe(true);
  });
});
