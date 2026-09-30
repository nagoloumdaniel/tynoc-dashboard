import { describe, expect, it } from "vitest";
import {
  adminCreateSchema,
  passwordChangeSchema,
  roleChangeSchema,
  userListQuerySchema,
  userUpdateSchema,
} from "./schemas";

const messages = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("userUpdateSchema", () => {
  it("normalises name, email and phone", () => {
    expect(
      userUpdateSchema.parse({
        name: " Jeanne Martin ",
        email: " Jeanne@Exemple.FR ",
        phone: "",
      }),
    ).toEqual({
      name: "Jeanne Martin",
      email: "jeanne@exemple.fr",
      phone: undefined,
    });
  });

  it.each([
    ["name", "J", "Le nom doit contenir entre 2 et 80 caractères."],
    ["email", "pas-un-email", "Saisissez une adresse email valide."],
    ["phone", "abc", "Numéro de téléphone invalide."],
  ])("refuses %s = %j", (field, value, message) => {
    const input = {
      name: "Jeanne",
      email: "j@exemple.fr",
      phone: "",
      [field]: value,
    };
    expect(messages(userUpdateSchema.safeParse(input))).toContain(message);
  });
});

describe("adminCreateSchema", () => {
  it("accepts an administrator role only", () => {
    const base = { name: "Paul", email: "paul@exemple.fr" };
    expect(adminCreateSchema.parse({ ...base, role: "ADMIN" }).role).toBe(
      "ADMIN",
    );
    expect(
      messages(adminCreateSchema.safeParse({ ...base, role: "CUSTOMER" })),
    ).toContain("Choisissez un rôle.");
  });
});

describe("roleChangeSchema", () => {
  it("accepts any role", () => {
    expect(roleChangeSchema.parse({ role: "CUSTOMER" })).toEqual({
      role: "CUSTOMER",
    });
  });
});

describe("passwordChangeSchema", () => {
  const valid = {
    current: "ancien-mot-de-passe",
    next: "nouveau-mot-de-passe-2026",
    confirm: "nouveau-mot-de-passe-2026",
  };

  it("accepts a valid change", () => {
    expect(passwordChangeSchema.parse(valid)).toEqual(valid);
  });

  it.each([
    [{ next: "court", confirm: "court" }, "12 caractères minimum."],
    [
      { confirm: "autre-chose-2026" },
      "Les deux mots de passe ne correspondent pas.",
    ],
    [
      { next: "ancien-mot-de-passe", confirm: "ancien-mot-de-passe" },
      "Choisissez un mot de passe différent de l'actuel.",
    ],
    [{ current: "" }, "Saisissez votre mot de passe actuel."],
  ])("refuses %j", (overrides, message) => {
    expect(
      messages(passwordChangeSchema.safeParse({ ...valid, ...overrides })),
    ).toContain(message);
  });
});

describe("userListQuerySchema", () => {
  it("applies defaults and falls back on invalid values", () => {
    expect(userListQuerySchema.parse({})).toEqual({
      q: "",
      type: "all",
      status: "current",
      sort: "-createdAt",
      page: 1,
    });
    expect(
      userListQuerySchema.parse({
        type: "robots",
        status: "x",
        sort: "?",
        page: "0",
      }),
    ).toMatchObject({
      type: "all",
      status: "current",
      sort: "-createdAt",
      page: 1,
    });
  });
});
