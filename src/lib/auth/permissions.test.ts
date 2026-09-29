import { describe, expect, it } from "vitest";
import { can, isAdminRole, ROLE_LABELS } from "./permissions";

describe("can", () => {
  it.each([
    ["SUPER_ADMIN", "admins:manage", true],
    ["SUPER_ADMIN", "users:delete", true],
    ["ADMIN", "read", true],
    ["ADMIN", "products:write", true],
    ["ADMIN", "users:write", true],
    ["ADMIN", "users:delete", false],
    ["ADMIN", "admins:manage", false],
    ["SUPER_ADMIN", "products:delete", true],
    ["ADMIN", "products:delete", false],
    ["VIEWER", "read", true],
    ["VIEWER", "products:write", false],
    ["VIEWER", "users:write", false],
  ] as const)("%s / %s → %s", (role, permission, expected) => {
    expect(can(role, permission)).toBe(expected);
  });
});

describe("isAdminRole", () => {
  it("accepts the three admin roles only", () => {
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("VIEWER")).toBe(true);
    expect(isAdminRole("CUSTOMER")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});

describe("ROLE_LABELS", () => {
  it("names every role in French", () => {
    expect(ROLE_LABELS).toEqual({
      SUPER_ADMIN: "Super administrateur",
      ADMIN: "Administrateur",
      VIEWER: "Lecture seule",
    });
  });
});
