import "server-only";
import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { cache } from "react";
import {
  queryAllCartLines,
  queryAllWishlistLines,
  readProducts,
} from "@/features/carts/repository";
import { listCategoryTree } from "@/features/categories/service";
import { queryProductsByStatus } from "@/features/products/repository";
import { stockLevel } from "@/features/products/stock";
import { queryUsersByStatus } from "@/features/users/repository";
import { db, table } from "@/lib/aws/dynamodb";
import { countByDay, topWishlisted } from "./charts";
import { compare, countInRanges } from "./comparison";
import { type Period, periodRanges, snapshotDate } from "./period";

export const KPI_FIELDS = [
  "totalUsers",
  "totalProducts",
  "totalCategories",
  "cartItems",
  "wishlistItems",
  "outOfStock",
  "lowStock",
] as const;
export type KpiField = (typeof KPI_FIELDS)[number];
type Counters = Record<KpiField, number>;

async function readCounters(pk: string): Promise<Counters | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Stats"),
      Key: { pk },
      ConsistentRead: true,
    }),
  );
  if (!Item) return null;
  return Object.fromEntries(
    KPI_FIELDS.map((field) => [field, Math.max(0, Number(Item[field] ?? 0))]),
  ) as Counters;
}

const snapshotKey = (date: string) => `SNAPSHOT#${date}`;

// ---- Shared loaders (one read per request) ----------------------------------

const loadProducts = cache(async () =>
  (
    await Promise.all(
      (["ACTIVE", "DRAFT", "ARCHIVED"] as const).map(queryProductsByStatus),
    )
  ).flat(),
);

const loadUsers = cache(async () =>
  (
    await Promise.all(
      (["ACTIVE", "SUSPENDED", "DELETED"] as const).map(queryUsersByStatus),
    )
  ).flat(),
);

// ---- Figures -----------------------------------------------------------------

/** Totals now, compared with the snapshot taken `period` days ago. */
export async function getKpis(period: Period, now = new Date()) {
  const [current, past] = await Promise.all([
    readCounters("GLOBAL"),
    readCounters(snapshotKey(snapshotDate(now, period))),
  ]);
  return Object.fromEntries(
    KPI_FIELDS.map((field) => [
      field,
      compare(current?.[field] ?? 0, past ? past[field] : null),
    ]),
  ) as Record<KpiField, ReturnType<typeof compare>>;
}

async function countAdminActions(from: string, to: string) {
  let count = 0;
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("AuditLogs"),
        IndexName: "byFeed",
        KeyConditionExpression:
          "feed = :feed AND createdAt BETWEEN :from AND :to",
        ExpressionAttributeValues: { ":feed": "LOG", ":from": from, ":to": to },
        Select: "COUNT",
        ExclusiveStartKey: startKey,
      }),
    );
    count += page.Count ?? 0;
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return count;
}

/** Flows over the period vs the previous one, derived from dates. */
export async function getMovements(period: Period, now = new Date()) {
  const ranges = periodRanges(period, now);
  const [users, products, cartLines, wishlistLines, actionsNow, actionsBefore] =
    await Promise.all([
      loadUsers(),
      loadProducts(),
      queryAllCartLines(),
      queryAllWishlistLines(),
      countAdminActions(ranges.current.from, ranges.current.to),
      countAdminActions(ranges.previous.from, ranges.previous.to),
    ]);

  const flow = (dates: string[]) => {
    const { current, previous } = countInRanges(dates, ranges);
    return compare(current, previous);
  };
  return {
    newCustomers: flow(
      users.filter((u) => u.role === "CUSTOMER").map((u) => u.createdAt),
    ),
    newProducts: flow(products.map((p) => p.createdAt)),
    cartAdditions: flow(cartLines.map((l) => l.addedAt)),
    wishlistAdditions: flow(wishlistLines.map((l) => l.addedAt)),
    adminActions: compare(actionsNow, actionsBefore),
  };
}

// ---- Widgets -----------------------------------------------------------------

export async function getStockAlerts(limit = 8) {
  const products = (await loadProducts()).filter(
    (p) => p.status !== "ARCHIVED" && stockLevel(p) !== "IN",
  );
  return products
    .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name, "fr"))
    .slice(0, limit);
}

export async function getLatestProducts(limit = 5) {
  return [...(await loadProducts())]
    .filter((p) => p.status !== "ARCHIVED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function getLatestCustomers(limit = 5) {
  return [...(await loadUsers())]
    .filter((u) => u.role === "CUSTOMER" && u.status !== "DELETED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

// ---- Charts ------------------------------------------------------------------

export async function getChartData(period: Period, now = new Date()) {
  const [tree, users, wishlistLines] = await Promise.all([
    listCategoryTree(),
    loadUsers(),
    queryAllWishlistLines(),
  ]);
  const names = new Map(
    [...(await readProducts(wishlistLines.map((l) => l.productId)))].map(
      ([id, product]) => [id, product.name],
    ),
  );
  return {
    productsPerCategory: tree.map((node) => ({
      label: node.name,
      count: node.productCount,
    })),
    newCustomersPerDay: countByDay(
      users.filter((u) => u.role === "CUSTOMER").map((u) => u.createdAt),
      now,
      period,
    ),
    topWishlisted: topWishlisted(wishlistLines, names),
  };
}

// ---- Daily snapshot ----------------------------------------------------------

/** Copies today's counters so later periods can be compared. Idempotent. */
export async function writeSnapshot(now = new Date()): Promise<string> {
  const date = snapshotDate(now, 0);
  const counters = (await readCounters("GLOBAL")) ?? null;
  await db().send(
    new PutCommand({
      TableName: table("Stats"),
      Item: {
        pk: snapshotKey(date),
        ...(counters ?? {}),
        takenAt: now.toISOString(),
      },
    }),
  );
  return date;
}
