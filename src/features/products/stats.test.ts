import { describe, expect, it } from "vitest";
import { statsDelta } from "./stats";
import type { Product } from "./types";

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "prd_1",
    name: "Chaise",
    nameNormalized: "chaise",
    slug: "chaise",
    sku: "CHS-1",
    categoryId: "cat_a",
    priceInCents: 1000,
    stock: 20,
    lowStockThreshold: 5,
    imageKeys: [],
    status: "ACTIVE",
    version: 1,
    createdAt: "2026-09-30T00:00:00.000Z",
    updatedAt: "2026-09-30T00:00:00.000Z",
    ...overrides,
  };
}

const none = { totalProducts: 0, outOfStock: 0, lowStock: 0, categories: {} };

describe("statsDelta", () => {
  it("counts a new product in stock", () => {
    expect(statsDelta(null, product())).toEqual({
      ...none,
      totalProducts: 1,
      categories: { cat_a: 1 },
    });
  });

  it("counts a new draft out of stock", () => {
    expect(statsDelta(null, product({ status: "DRAFT", stock: 0 }))).toEqual({
      totalProducts: 1,
      outOfStock: 1,
      lowStock: 0,
      categories: { cat_a: 1 },
    });
  });

  it("removes an archived product from every counter", () => {
    const before = product({ stock: 2 });
    expect(statsDelta(before, { ...before, status: "ARCHIVED" })).toEqual({
      totalProducts: -1,
      outOfStock: 0,
      lowStock: -1,
      categories: { cat_a: -1 },
    });
  });

  it("counts a restored product again", () => {
    const archived = product({ status: "ARCHIVED", stock: 0 });
    expect(statsDelta(archived, { ...archived, status: "DRAFT" })).toEqual({
      totalProducts: 1,
      outOfStock: 1,
      lowStock: 0,
      categories: { cat_a: 1 },
    });
  });

  it("moves a product from low stock to out of stock", () => {
    const before = product({ stock: 3 });
    expect(statsDelta(before, { ...before, stock: 0 })).toEqual({
      ...none,
      outOfStock: 1,
      lowStock: -1,
    });
  });

  it("moves the category count when the category changes", () => {
    const before = product();
    expect(statsDelta(before, { ...before, categoryId: "cat_b" })).toEqual({
      ...none,
      categories: { cat_a: -1, cat_b: 1 },
    });
  });

  it("does not change anything when deleting an archived product", () => {
    expect(statsDelta(product({ status: "ARCHIVED" }), null)).toEqual(none);
  });

  it("uncounts a deleted active product", () => {
    expect(statsDelta(product(), null)).toEqual({
      ...none,
      totalProducts: -1,
      categories: { cat_a: -1 },
    });
  });
});
