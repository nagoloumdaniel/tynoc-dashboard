import { describe, expect, it } from "vitest";
import { cartListQuerySchema, wishlistListQuerySchema } from "./schemas";
import {
  availability,
  filterSortPaginateCarts,
  filterSortPaginateWishlists,
  groupByUser,
  summarizeCart,
  summarizeWishlist,
} from "./summary";
import type { CartLine, ProductSnapshot } from "./types";

const NOW = new Date("2026-09-30T12:00:00.000Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 86_400_000).toISOString();

const product = (
  id: string,
  overrides: Partial<ProductSnapshot> = {},
): ProductSnapshot => ({
  id,
  name: `Produit ${id}`,
  sku: `SKU-${id}`,
  priceInCents: 1000,
  stock: 10,
  status: "ACTIVE",
  ...overrides,
});

const line = (
  productId: string,
  quantity: number,
  updatedAt = daysAgo(1),
  userId = "usr_1",
): CartLine => ({ userId, productId, quantity, addedAt: updatedAt, updatedAt });

describe("availability", () => {
  it.each([
    [undefined, 1, "DELETED"],
    [product("a", { status: "ARCHIVED" }), 1, "ARCHIVED"],
    [product("a", { stock: 0 }), 1, "OUT"],
    [product("a", { stock: 2 }), 3, "INSUFFICIENT"],
    [product("a", { stock: 3 }), 3, "OK"],
  ] as const)("%j × %i → %s", (snapshot, quantity, expected) => {
    expect(availability(snapshot, quantity)).toBe(expected);
  });
});

describe("summarizeCart", () => {
  const products = new Map([
    ["a", product("a", { priceInCents: 1000, salePriceInCents: 800 })],
    ["b", product("b", { priceInCents: 2500, stock: 0 })],
  ]);

  it("totals lines, quantities and the value at current prices", () => {
    const summary = summarizeCart(
      "usr_1",
      [line("a", 2, daysAgo(3)), line("b", 1, daysAgo(1)), line("gone", 4)],
      products,
      NOW,
    );
    expect(summary).toEqual({
      userId: "usr_1",
      lines: 3,
      quantity: 7,
      // 2 × 8,00 (sale price) + 1 × 25,00 ; a deleted product counts for 0.
      valueInCents: 4100,
      updatedAt: daysAgo(1),
      abandoned: false,
      unavailableLines: 2,
    });
  });

  it("marks a cart untouched for more than 7 days as abandoned", () => {
    expect(
      summarizeCart("usr_1", [line("a", 1, daysAgo(8))], products, NOW)
        .abandoned,
    ).toBe(true);
    expect(
      summarizeCart("usr_1", [line("a", 1, daysAgo(6))], products, NOW)
        .abandoned,
    ).toBe(false);
  });
});

describe("summarizeWishlist", () => {
  it("counts products and keeps the latest addition", () => {
    expect(
      summarizeWishlist("usr_1", [
        { userId: "usr_1", productId: "a", addedAt: daysAgo(5) },
        { userId: "usr_1", productId: "b", addedAt: daysAgo(2) },
      ]),
    ).toEqual({ userId: "usr_1", count: 2, lastAddedAt: daysAgo(2) });
  });
});

describe("groupByUser", () => {
  it("groups lines per customer", () => {
    const groups = groupByUser([
      line("a", 1, daysAgo(1), "usr_1"),
      line("b", 1, daysAgo(1), "usr_2"),
      line("c", 1, daysAgo(1), "usr_1"),
    ]);
    expect([...groups.keys()]).toEqual(["usr_1", "usr_2"]);
    expect(groups.get("usr_1")).toHaveLength(2);
  });
});

describe("filterSortPaginateCarts", () => {
  const rows = [
    {
      userId: "u1",
      lines: 1,
      quantity: 1,
      valueInCents: 5000,
      updatedAt: daysAgo(10),
      abandoned: true,
      unavailableLines: 0,
      customer: { name: "Élodie Durand", email: "elodie@exemple.fr" },
    },
    {
      userId: "u2",
      lines: 2,
      quantity: 3,
      valueInCents: 9000,
      updatedAt: daysAgo(1),
      abandoned: false,
      unavailableLines: 0,
      customer: { name: "Bruno Petit", email: "bruno@exemple.fr" },
    },
    {
      userId: "u3",
      lines: 1,
      quantity: 1,
      valueInCents: 100,
      updatedAt: daysAgo(3),
      abandoned: false,
      unavailableLines: 1,
      customer: null,
    },
  ];
  const ids = (params: Record<string, string>) =>
    filterSortPaginateCarts(rows, cartListQuerySchema.parse(params)).items.map(
      (r) => r.userId,
    );

  it("sorts by latest update by default, or by value", () => {
    expect(ids({})).toEqual(["u2", "u3", "u1"]);
    expect(ids({ sort: "-value" })).toEqual(["u2", "u1", "u3"]);
  });

  it("searches customers without accents and filters abandoned carts", () => {
    expect(ids({ q: "elodie" })).toEqual(["u1"]);
    expect(ids({ abandoned: "1" })).toEqual(["u1"]);
  });
});

describe("filterSortPaginateWishlists", () => {
  it("sorts by size when asked", () => {
    const rows = [
      { userId: "u1", count: 1, lastAddedAt: daysAgo(1), customer: null },
      { userId: "u2", count: 4, lastAddedAt: daysAgo(5), customer: null },
    ];
    const page = filterSortPaginateWishlists(
      rows,
      wishlistListQuerySchema.parse({ sort: "-count" }),
    );
    expect(page.items.map((r) => r.userId)).toEqual(["u2", "u1"]);
  });
});
