import { normalizeText } from "@/lib/format";
import type { CartListQuery, WishlistListQuery } from "./schemas";
import type {
  Availability,
  CartLine,
  CartSummary,
  CustomerInfo,
  ProductSnapshot,
  WishlistLine,
  WishlistSummary,
} from "./types";

export const ABANDONED_AFTER_DAYS = 7;
export const LIST_PAGE_SIZE = 20;

export function availability(
  product: ProductSnapshot | undefined,
  quantity = 1,
): Availability {
  if (!product) return "DELETED";
  if (product.status === "ARCHIVED") return "ARCHIVED";
  if (product.stock <= 0) return "OUT";
  if (product.stock < quantity) return "INSUFFICIENT";
  return "OK";
}

/** Price the customer would pay today. */
export const unitPrice = (product: ProductSnapshot) =>
  product.salePriceInCents ?? product.priceInCents;

export function groupByUser<T extends { userId: string }>(lines: T[]) {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const group = groups.get(line.userId);
    if (group) group.push(line);
    else groups.set(line.userId, [line]);
  }
  return groups;
}

const latest = (dates: string[]) =>
  dates.reduce((max, date) => (date > max ? date : max), "");

export function summarizeCart(
  userId: string,
  lines: CartLine[],
  products: Map<string, ProductSnapshot>,
  now = new Date(),
): CartSummary {
  const updatedAt = latest(lines.map((l) => l.updatedAt));
  const cutoff = now.getTime() - ABANDONED_AFTER_DAYS * 86_400_000;
  let valueInCents = 0;
  let quantity = 0;
  let unavailableLines = 0;
  for (const line of lines) {
    const product = products.get(line.productId);
    quantity += line.quantity;
    if (product) valueInCents += unitPrice(product) * line.quantity;
    if (availability(product, line.quantity) !== "OK") unavailableLines++;
  }
  return {
    userId,
    lines: lines.length,
    quantity,
    valueInCents,
    updatedAt,
    abandoned: lines.length > 0 && new Date(updatedAt).getTime() < cutoff,
    unavailableLines,
  };
}

export function summarizeWishlist(
  userId: string,
  lines: WishlistLine[],
): WishlistSummary {
  return {
    userId,
    count: lines.length,
    lastAddedAt: latest(lines.map((l) => l.addedAt)),
  };
}

type WithCustomer = { customer: CustomerInfo };

function matchesCustomer(row: WithCustomer, search: string) {
  if (!search) return true;
  if (!row.customer) return false;
  return (
    normalizeText(row.customer.name).includes(search) ||
    row.customer.email.includes(search)
  );
}

function paginate<T>(rows: T[], requested: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requested, pageCount);
  return {
    items: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    page,
    pageCount,
  };
}

export type CartRow = CartSummary & WithCustomer;
export type WishlistRow = WishlistSummary & WithCustomer;

export function filterSortPaginateCarts(
  rows: CartRow[],
  query: CartListQuery,
  pageSize = LIST_PAGE_SIZE,
) {
  const search = normalizeText(query.q);
  const sorted = rows
    .filter((row) => matchesCustomer(row, search))
    .filter((row) => !query.abandoned || row.abandoned)
    .sort((a, b) => {
      if (query.sort === "-value") return b.valueInCents - a.valueInCents;
      const order = a.updatedAt.localeCompare(b.updatedAt);
      return query.sort === "updatedAt" ? order : -order;
    });
  return paginate(sorted, query.page, pageSize);
}

export function filterSortPaginateWishlists(
  rows: WishlistRow[],
  query: WishlistListQuery,
  pageSize = LIST_PAGE_SIZE,
) {
  const search = normalizeText(query.q);
  const sorted = rows
    .filter((row) => matchesCustomer(row, search))
    .sort((a, b) =>
      query.sort === "-count"
        ? b.count - a.count
        : b.lastAddedAt.localeCompare(a.lastAddedAt),
    );
  return paginate(sorted, query.page, pageSize);
}
