import { stockLevel } from "./stock";
import type { Product } from "./types";

export type StatsDelta = {
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
  /** Change of productCount per category id (non-zero entries only). */
  categories: Record<string, number>;
};

type Counted = Pick<
  Product,
  "status" | "stock" | "lowStockThreshold" | "categoryId"
>;

function contribution(product: Counted | null) {
  // Archived products are not part of the catalog counters.
  if (!product || product.status === "ARCHIVED") return null;
  const level = stockLevel(product);
  return {
    out: level === "OUT" ? 1 : 0,
    low: level === "LOW" ? 1 : 0,
    categoryId: product.categoryId,
  };
}

/** Counter increments to apply, in the same transaction, for any change. */
export function statsDelta(
  before: Counted | null,
  after: Counted | null,
): StatsDelta {
  const old = contribution(before);
  const next = contribution(after);

  const categories: Record<string, number> = {};
  if (old) categories[old.categoryId] = (categories[old.categoryId] ?? 0) - 1;
  if (next)
    categories[next.categoryId] = (categories[next.categoryId] ?? 0) + 1;
  for (const [id, count] of Object.entries(categories)) {
    if (count === 0) delete categories[id];
  }

  return {
    totalProducts: (next ? 1 : 0) - (old ? 1 : 0),
    outOfStock: (next?.out ?? 0) - (old?.out ?? 0),
    lowStock: (next?.low ?? 0) - (old?.low ?? 0),
    categories,
  };
}
