import { describe, expect, it } from "vitest";
import { filterSortPaginate } from "./list";
import { productListQuerySchema } from "./schemas";
import type { ProductListItem } from "./types";

function item(
  id: string,
  overrides: Partial<ProductListItem> = {},
): ProductListItem {
  const name = overrides.name ?? `Produit ${id}`;
  return {
    id,
    name,
    nameNormalized: name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
    sku: `SKU-${id}`,
    categoryId: "cat_a",
    priceInCents: 1000,
    stock: 20,
    lowStockThreshold: 5,
    status: "ACTIVE",
    createdAt: "2026-09-01T00:00:00.000Z",
    version: 1,
    ...overrides,
  };
}

const query = (params: Record<string, string> = {}) =>
  productListQuerySchema.parse(params);

const ids = (result: { items: ProductListItem[] }) =>
  result.items.map((i) => i.id);

const catalog = [
  item("1", {
    name: "Chaise Élégante",
    priceInCents: 5000,
    stock: 0,
    createdAt: "2026-09-03T00:00:00.000Z",
  }),
  item("2", {
    name: "Table basse",
    priceInCents: 20000,
    stock: 3,
    categoryId: "cat_b",
    createdAt: "2026-09-01T00:00:00.000Z",
  }),
  item("3", {
    name: "Lampe",
    priceInCents: 3000,
    stock: 40,
    status: "DRAFT",
    createdAt: "2026-09-02T00:00:00.000Z",
  }),
  item("4", { name: "Vieux tabouret", status: "ARCHIVED", sku: "OLD-9" }),
];

describe("filterSortPaginate", () => {
  it("shows active and draft products by default, newest first", () => {
    expect(ids(filterSortPaginate(catalog, query()))).toEqual(["1", "3", "2"]);
  });

  it("searches names without accents and SKUs, case-insensitively", () => {
    expect(ids(filterSortPaginate(catalog, query({ q: "ELEGANTE" })))).toEqual([
      "1",
    ]);
    expect(ids(filterSortPaginate(catalog, query({ q: "sku-2" })))).toEqual([
      "2",
    ]);
    expect(
      ids(filterSortPaginate(catalog, query({ q: "old", status: "ARCHIVED" }))),
    ).toEqual(["4"]);
  });

  it("filters by status, category and stock level", () => {
    expect(
      ids(filterSortPaginate(catalog, query({ status: "DRAFT" }))),
    ).toEqual(["3"]);
    expect(
      ids(filterSortPaginate(catalog, query({ category: "cat_b" }))),
    ).toEqual(["2"]);
    expect(ids(filterSortPaginate(catalog, query({ stock: "out" })))).toEqual([
      "1",
    ]);
    expect(ids(filterSortPaginate(catalog, query({ stock: "low" })))).toEqual([
      "2",
    ]);
    expect(ids(filterSortPaginate(catalog, query({ stock: "in" })))).toEqual([
      "3",
    ]);
  });

  it.each([
    ["name", ["1", "3", "2"]],
    ["-name", ["2", "3", "1"]],
    ["price", ["3", "1", "2"]],
    ["-price", ["2", "1", "3"]],
    ["stock", ["1", "2", "3"]],
    ["-stock", ["3", "2", "1"]],
    ["createdAt", ["2", "3", "1"]],
    ["-createdAt", ["1", "3", "2"]],
  ])("sorts by %s", (sort, expected) => {
    expect(ids(filterSortPaginate(catalog, query({ sort })))).toEqual(expected);
  });

  it("paginates 20 per page and clamps an out-of-range page", () => {
    const many = Array.from({ length: 45 }, (_, i) =>
      item(String(i).padStart(2, "0"), {
        name: `P${String(i).padStart(2, "0")}`,
      }),
    );
    const first = filterSortPaginate(many, query({ sort: "name" }));
    expect(first).toMatchObject({ total: 45, page: 1, pageCount: 3 });
    expect(first.items).toHaveLength(20);

    const last = filterSortPaginate(many, query({ sort: "name", page: "9" }));
    expect(last.page).toBe(3);
    expect(ids(last)).toEqual(["40", "41", "42", "43", "44"]);
  });

  it("returns one empty page when nothing matches", () => {
    expect(filterSortPaginate(catalog, query({ q: "introuvable" }))).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageCount: 1,
    });
  });
});
