import { describe, expect, it } from "vitest";
import { categoryFormSchema } from "./schemas";

const valid = {
  name: " Chaises ",
  slug: "chaises",
  description: "",
  parentId: "cat_mobilier",
  sortOrder: "10",
  isActive: "on",
};

describe("categoryFormSchema", () => {
  it("parses a valid sub-category", () => {
    expect(categoryFormSchema.parse(valid)).toEqual({
      name: "Chaises",
      slug: "chaises",
      description: undefined,
      parentId: "cat_mobilier",
      sortOrder: 10,
      isActive: true,
    });
  });

  it("treats an unchecked box as inactive and an empty parent as top-level", () => {
    expect(
      categoryFormSchema.parse({ ...valid, isActive: "", parentId: "" }),
    ).toMatchObject({ isActive: false, parentId: "ROOT" });
  });

  it.each([
    ["name", "A", "Le nom doit contenir entre 2 et 60 caractères."],
    ["slug", "Chaises !", "Minuscules, chiffres et tirets uniquement."],
    ["sortOrder", "-1", "Nombre entier positif attendu."],
    ["sortOrder", "10000", "Valeur trop grande."],
  ])("refuses %s = %j", (field, value, message) => {
    const result = categoryFormSchema.safeParse({ ...valid, [field]: value });
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      message,
    );
  });
});
