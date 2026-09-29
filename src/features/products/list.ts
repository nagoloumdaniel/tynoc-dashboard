import { normalizeText } from "@/lib/format";
import type { ProductListQuery, ProductSort } from "./schemas";
import { stockLevel } from "./stock";
import type { ProductListItem } from "./types";

export const PAGE_SIZE = 20;

export type ProductPage = {
  items: ProductListItem[];
  total: number;
  page: number;
  pageCount: number;
};

const STOCK_FILTER = { in: "IN", low: "LOW", out: "OUT" } as const;

type SortKey = "name" | "price" | "stock" | "createdAt";

const compareBy: Record<
  SortKey,
  (a: ProductListItem, b: ProductListItem) => number
> = {
  name: (a, b) => a.nameNormalized.localeCompare(b.nameNormalized, "fr"),
  price: (a, b) => a.priceInCents - b.priceInCents,
  stock: (a, b) => a.stock - b.stock,
  createdAt: (a, b) => a.createdAt.localeCompare(b.createdAt),
};

function comparator(sort: ProductSort) {
  const descending = sort.startsWith("-");
  const primary = compareBy[sort.replace("-", "") as SortKey];
  return (a: ProductListItem, b: ProductListItem) => {
    const result = primary(a, b);
    if (result !== 0) return descending ? -result : result;
    // Stable tie-break so pages never shuffle between requests.
    return compareBy.name(a, b) || a.id.localeCompare(b.id);
  };
}

function matches(
  item: ProductListItem,
  query: ProductListQuery,
  search: string,
) {
  if (query.status === "current") {
    if (item.status === "ARCHIVED") return false;
  } else if (item.status !== query.status) {
    return false;
  }
  if (query.category && item.categoryId !== query.category) return false;
  if (query.stock && stockLevel(item) !== STOCK_FILTER[query.stock]) {
    return false;
  }
  if (
    search &&
    !item.nameNormalized.includes(search) &&
    !item.sku.toLowerCase().includes(search)
  ) {
    return false;
  }
  return true;
}

/** Search, filters, sort and pagination over the loaded catalog. */
export function filterSortPaginate(
  items: ProductListItem[],
  query: ProductListQuery,
  pageSize = PAGE_SIZE,
): ProductPage {
  const search = normalizeText(query.q);
  const filtered = items
    .filter((item) => matches(item, query, search))
    .sort(comparator(query.sort));

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(query.page, pageCount);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageCount,
  };
}
