import { describe, expect, it } from "vitest";
import { canManageUser, type UserAction } from "./policy";
import type { UserRole } from "./types";

const actor = (role: "SUPER_ADMIN" | "ADMIN" | "VIEWER") => ({
  userId: "usr_me",
  role,
});
const target = (role: UserRole, id = "usr_other") => ({ id, role });

const allowed = (
  a: ReturnType<typeof actor>,
  t: ReturnType<typeof target>,
  action: UserAction,
) => canManageUser(a, t, action).ok;

describe("canManageUser", () => {
  it("lets an admin manage customers but not administrators", () => {
    for (const action of ["edit", "suspend", "reactivate"] as const) {
      expect(allowed(actor("ADMIN"), target("CUSTOMER"), action)).toBe(true);
      expect(allowed(actor("ADMIN"), target("VIEWER"), action)).toBe(false);
      expect(allowed(actor("ADMIN"), target("SUPER_ADMIN"), action)).toBe(
        false,
      );
    }
  });

  it("reserves roles, password resets and anonymisation to super admins", () => {
    for (const action of [
      "changeRole",
      "resetPassword",
      "anonymize",
    ] as const) {
      expect(allowed(actor("ADMIN"), target("CUSTOMER"), action)).toBe(false);
      expect(allowed(actor("SUPER_ADMIN"), target("ADMIN"), action)).toBe(true);
    }
  });

  it("gives a read-only admin no write action", () => {
    for (const action of [
      "edit",
      "suspend",
      "reactivate",
      "changeRole",
      "resetPassword",
      "anonymize",
    ] as const) {
      expect(allowed(actor("VIEWER"), target("CUSTOMER"), action)).toBe(false);
    }
  });

  it("forbids suspending, demoting or anonymising oneself", () => {
    const me = target("SUPER_ADMIN", "usr_me");
    for (const action of ["suspend", "changeRole", "anonymize"] as const) {
      expect(canManageUser(actor("SUPER_ADMIN"), me, action)).toEqual({
        ok: false,
        code: "FORBIDDEN_SELF",
        message:
          "Vous ne pouvez pas faire cette action sur votre propre compte.",
      });
    }
    expect(allowed(actor("SUPER_ADMIN"), me, "edit")).toBe(true);
  });

  it("does not reset a customer's password (customers log in on the shop)", () => {
    expect(
      allowed(actor("SUPER_ADMIN"), target("CUSTOMER"), "resetPassword"),
    ).toBe(false);
  });

  it("explains a refusal", () => {
    expect(
      canManageUser(actor("ADMIN"), target("ADMIN"), "suspend"),
    ).toMatchObject({ ok: false, code: "FORBIDDEN" });
  });
});
