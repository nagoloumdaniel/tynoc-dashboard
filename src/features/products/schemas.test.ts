import { describe, expect, it } from "vitest";
import {
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  stockAdjustmentSchema,
} from "./schemas";

const valid = {
  name: "  Chaise en chêne ",
  slug: "chaise-en-chene",
  sku: "chs-001",
  description: "",
  categoryId: "cat_mobilier",
  price: "129,90",
  salePrice: "",
  stock: "12",
  lowStockThreshold: "5",
  status: "ACTIVE",
};

const messages = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("productCreateSchema", () => {
  it("normalises a valid product and converts prices to cents", () => {
    expect(productCreateSchema.parse(valid)).toEqual({
      name: "Chaise en chêne",
      slug: "chaise-en-chene",
      sku: "CHS-001",
      description: undefined,
      categoryId: "cat_mobilier",
      priceInCents: 12990,
      salePriceInCents: undefined,
      stock: 12,
      lowStockThreshold: 5,
      status: "ACTIVE",
    });
  });

  it("accepts a sale price lower than the price", () => {
    expect(
      productCreateSchema.parse({ ...valid, salePrice: "99" }).salePriceInCents,
    ).toBe(9900);
  });

  it("refuses a sale price equal to or above the price", () => {
    const result = productCreateSchema.safeParse({
      ...valid,
      salePrice: "129,90",
    });
    expect(messages(result)).toContain(
      "Le prix promotionnel doit être inférieur au prix.",
    );
    expect(result.error?.issues[0]?.path).toEqual(["salePrice"]);
  });

  it.each([
    ["name", "A", "Le nom doit contenir entre 2 et 120 caractères."],
    ["slug", "Chaise Chêne", "Minuscules, chiffres et tirets uniquement."],
    ["sku", "A B", "2 à 50 caractères : lettres, chiffres et tirets."],
    ["categoryId", "", "Choisissez une catégorie."],
    ["price", "12,345", "Montant invalide (exemple : 24,99)."],
    ["price", "", "Montant invalide (exemple : 24,99)."],
    ["stock", "-1", "Nombre entier positif attendu."],
    ["stock", "2.5", "Nombre entier positif attendu."],
    ["stock", "1000001", "Valeur trop grande."],
    ["status", "ARCHIVED", "Statut invalide."],
  ])("refuses %s = %j", (field, value, message) => {
    expect(
      messages(productCreateSchema.safeParse({ ...valid, [field]: value })),
    ).toContain(message);
  });
});

describe("productUpdateSchema", () => {
  it("has no stock field: stock changes go through adjustments", () => {
    const parsed = productUpdateSchema.parse({ ...valid, stock: "999" });
    expect(parsed).not.toHaveProperty("stock");
  });
});

describe("stockAdjustmentSchema", () => {
  it("accepts a negative delta with a reason", () => {
    expect(
      stockAdjustmentSchema.parse({
        mode: "DELTA",
        quantity: "-3",
        reason: "DAMAGE",
        note: " cassé au déballage ",
      }),
    ).toEqual({
      mode: "DELTA",
      quantity: -3,
      reason: "DAMAGE",
      note: "cassé au déballage",
    });
  });

  it("refuses a zero delta and a negative absolute value", () => {
    expect(
      messages(
        stockAdjustmentSchema.safeParse({
          mode: "DELTA",
          quantity: "0",
          reason: "INVENTORY",
        }),
      ),
    ).toContain("Indiquez une variation différente de zéro.");
    expect(
      messages(
        stockAdjustmentSchema.safeParse({
          mode: "SET",
          quantity: "-1",
          reason: "INVENTORY",
        }),
      ),
    ).toContain("Le stock ne peut pas être négatif.");
  });

  it("requires a known reason", () => {
    expect(
      messages(
        stockAdjustmentSchema.safeParse({
          mode: "SET",
          quantity: "4",
          reason: "",
        }),
      ),
    ).toContain("Choisissez une raison.");
  });
});

describe("productListQuerySchema", () => {
  it("applies defaults", () => {
    expect(productListQuerySchema.parse({})).toEqual({
      q: "",
      category: undefined,
      status: "current",
      stock: undefined,
      sort: "-createdAt",
      page: 1,
    });
  });

  it("keeps valid values and takes the first of repeated params", () => {
    expect(
      productListQuerySchema.parse({
        q: ["chaise", "table"],
        category: "cat_mobilier",
        status: "ARCHIVED",
        stock: "low",
        sort: "price",
        page: "3",
      }),
    ).toEqual({
      q: "chaise",
      category: "cat_mobilier",
      status: "ARCHIVED",
      stock: "low",
      sort: "price",
      page: 3,
    });
  });

  it("falls back to defaults for invalid values", () => {
    expect(
      productListQuerySchema.parse({
        status: "DELETED",
        stock: "plenty",
        sort: "random",
        page: "-2",
      }),
    ).toMatchObject({
      status: "current",
      stock: undefined,
      sort: "-createdAt",
      page: 1,
    });
  });
});
