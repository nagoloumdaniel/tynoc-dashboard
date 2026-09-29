import { describe, expect, it } from "vitest";
import { filterSortPaginateUsers } from "./list";
import { userListQuerySchema } from "./schemas";
import type { UserListItem } from "./types";

const user = (
  id: string,
  overrides: Partial<UserListItem> = {},
): UserListItem => ({
  id,
  name: `Utilisateur ${id}`,
  email: `${id}@exemple.fr`,
  role: "CUSTOMER",
  status: "ACTIVE",
  createdAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const users = [
  user("1", { name: "Élodie Durand", createdAt: "2026-09-03T00:00:00.000Z" }),
  user("2", {
    name: "Bruno Petit",
    role: "ADMIN",
    createdAt: "2026-09-01T00:00:00.000Z",
  }),
  user("3", {
    name: "Chloé Martin",
    status: "SUSPENDED",
    createdAt: "2026-09-02T00:00:00.000Z",
  }),
  user("4", { name: "Utilisateur supprimé", status: "DELETED" }),
];

const run = (params: Record<string, string> = {}) =>
  filterSortPaginateUsers(users, userListQuerySchema.parse(params)).items.map(
    (u) => u.id,
  );

describe("filterSortPaginateUsers", () => {
  it("hides deleted accounts by default, newest first", () => {
    expect(run()).toEqual(["1", "3", "2"]);
  });

  it("searches names without accents and emails", () => {
    expect(run({ q: "elodie" })).toEqual(["1"]);
    expect(run({ q: "2@exemple" })).toEqual(["2"]);
  });

  it("filters by account type and status", () => {
    expect(run({ type: "admins" })).toEqual(["2"]);
    expect(run({ type: "customers" })).toEqual(["1", "3"]);
    expect(run({ status: "SUSPENDED" })).toEqual(["3"]);
    expect(run({ status: "DELETED" })).toEqual(["4"]);
  });

  it("sorts by name or oldest first", () => {
    expect(run({ sort: "name" })).toEqual(["2", "3", "1"]);
    expect(run({ sort: "createdAt" })).toEqual(["2", "3", "1"]);
  });
});
