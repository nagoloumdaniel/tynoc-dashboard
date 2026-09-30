import "server-only";
import { randomUUID } from "node:crypto";
import { isCategoryUsable } from "@/features/categories/service";
import {
  type AuditAction,
  auditOp,
  queryEntityActivity,
} from "@/lib/audit/audit-log";
import { table } from "@/lib/aws/dynamodb";
import {
  type TaggedItem,
  transact,
  TransactionConditionError,
} from "@/lib/aws/transaction";
import type { Session } from "@/lib/auth/session";
import { AppError, conflict, notFound } from "@/lib/errors";
import { formatPrice, normalizeText } from "@/lib/format";
import { filterSortPaginate, type ProductPage } from "./list";
import {
  countProductUsage,
  findProduct,
  queryProductsByStatus,
  releaseUniqueOp,
  reserveUniqueOp,
  skuKey,
  slugKey,
  statsOps,
} from "./repository";
import {
  type ProductCreateInput,
  type ProductListQuery,
  type ProductUpdateInput,
  STOCK_REASON_LABELS,
  type StockAdjustment,
} from "./schemas";
import { statsDelta } from "./stats";
import type { Product, ProductStatus } from "./types";

export type Actor = Session;

const ERRORS = {
  sku: () => conflict("SKU_TAKEN", "Ce SKU est déjà utilisé."),
  slug: () => conflict("SLUG_TAKEN", "Ce slug est déjà utilisé."),
  product: () =>
    conflict(
      "VERSION_CONFLICT",
      "Ce produit a été modifié par quelqu'un d'autre. Rechargez la page.",
    ),
} as const;

const productNotFound = () =>
  notFound("PRODUCT_NOT_FOUND", "Le produit demandé est introuvable.");

async function assertCategoryUsable(categoryId: string) {
  // Active, and its parent too when it is a sub-category.
  if (!(await isCategoryUsable(categoryId))) {
    throw new AppError(
      "CATEGORY_INVALID",
      400,
      "Catégorie inconnue ou inactive.",
    );
  }
}

async function run(items: TaggedItem[]): Promise<void> {
  try {
    await transact(items);
  } catch (error) {
    if (error instanceof TransactionConditionError) {
      const tag = error.failedTags.find(
        (t): t is keyof typeof ERRORS => t in ERRORS,
      );
      if (tag) throw ERRORS[tag]();
    }
    throw error;
  }
}

function putProductOp(product: Product, expectedVersion?: number): TaggedItem {
  return {
    tag: "product",
    item: {
      Put: {
        TableName: table("Products"),
        Item: product,
        ...(expectedVersion === undefined
          ? { ConditionExpression: "attribute_not_exists(id)" }
          : {
              ConditionExpression: "version = :expected",
              ExpressionAttributeValues: { ":expected": expectedVersion },
            }),
      },
    },
  };
}

function audit(
  actor: Actor,
  action: AuditAction,
  product: Product,
  summary: string,
  changes?: Record<string, { from: unknown; to: unknown }>,
) {
  return auditOp({
    actorId: actor.userId,
    actorEmail: actor.email,
    action,
    entityType: "PRODUCT",
    entityId: product.id,
    summary,
    changes,
  });
}

async function loadForChange(id: string, expectedVersion: number) {
  const product = await findProduct(id);
  if (!product) throw productNotFound();
  if (product.version !== expectedVersion) throw ERRORS.product();
  return product;
}

/** Saves a new version of a product with its counters and audit entry. */
async function saveVersion(
  before: Product,
  after: Product,
  extra: TaggedItem[],
): Promise<Product> {
  await run([
    putProductOp(after, before.version),
    ...extra,
    ...statsOps(statsDelta(before, after)),
  ]);
  return after;
}

// ---- Queries -----------------------------------------------------------------

export const getProduct = findProduct;

export async function listProducts(
  query: ProductListQuery,
  options: { categoryIds?: string[] } = {},
): Promise<ProductPage> {
  const statuses: ProductStatus[] =
    query.status === "current" ? ["ACTIVE", "DRAFT"] : [query.status];
  const items = (await Promise.all(statuses.map(queryProductsByStatus))).flat();
  return filterSortPaginate(items, query, options);
}

export const getProductUsage = countProductUsage;

export function getProductActivity(productId: string, limit = 10) {
  return queryEntityActivity("PRODUCT", productId, limit);
}

// ---- Commands ----------------------------------------------------------------

export async function createProduct(
  actor: Actor,
  input: ProductCreateInput,
): Promise<Product> {
  await assertCategoryUsable(input.categoryId);

  const now = new Date().toISOString();
  const product: Product = {
    ...input,
    id: `prd_${randomUUID()}`,
    nameNormalized: normalizeText(input.name),
    imageKeys: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await run([
    putProductOp(product),
    reserveUniqueOp("sku", skuKey(product.sku), product.id),
    reserveUniqueOp("slug", slugKey(product.slug), product.id),
    ...statsOps(statsDelta(null, product)),
    audit(actor, "CREATE", product, `Création de « ${product.name} »`),
  ]);
  return product;
}

const TRACKED_FIELDS = [
  "name",
  "slug",
  "sku",
  "description",
  "categoryId",
  "priceInCents",
  "salePriceInCents",
  "lowStockThreshold",
  "status",
] as const;

export async function updateProduct(
  actor: Actor,
  id: string,
  expectedVersion: number,
  input: ProductUpdateInput,
): Promise<Product> {
  const before = await loadForChange(id, expectedVersion);
  if (before.status === "ARCHIVED") {
    throw conflict(
      "PRODUCT_ARCHIVED",
      "Restaurez le produit avant de le modifier.",
    );
  }
  if (input.categoryId !== before.categoryId) {
    await assertCategoryUsable(input.categoryId);
  }

  const after: Product = {
    ...before,
    ...input,
    nameNormalized: normalizeText(input.name),
    version: before.version + 1,
    updatedAt: new Date().toISOString(),
  };

  const changes = Object.fromEntries(
    TRACKED_FIELDS.filter((field) => before[field] !== after[field]).map(
      (field) => [
        field,
        { from: before[field] ?? null, to: after[field] ?? null },
      ],
    ),
  );

  const uniqueOps: TaggedItem[] = [];
  if (after.sku !== before.sku) {
    uniqueOps.push(
      releaseUniqueOp("sku-old", skuKey(before.sku)),
      reserveUniqueOp("sku", skuKey(after.sku), id),
    );
  }
  if (after.slug !== before.slug) {
    uniqueOps.push(
      releaseUniqueOp("slug-old", slugKey(before.slug)),
      reserveUniqueOp("slug", slugKey(after.slug), id),
    );
  }

  return saveVersion(before, after, [
    ...uniqueOps,
    audit(actor, "UPDATE", after, `Modification de « ${after.name} »`, changes),
  ]);
}

export async function adjustStock(
  actor: Actor,
  id: string,
  expectedVersion: number,
  adjustment: StockAdjustment,
): Promise<Product> {
  const before = await loadForChange(id, expectedVersion);
  const stock =
    adjustment.mode === "SET"
      ? adjustment.quantity
      : before.stock + adjustment.quantity;
  if (stock < 0) {
    throw new AppError(
      "NEGATIVE_STOCK",
      400,
      "Le stock ne peut pas être négatif.",
    );
  }

  const after: Product = {
    ...before,
    stock,
    version: before.version + 1,
    updatedAt: new Date().toISOString(),
  };
  const reason = STOCK_REASON_LABELS[adjustment.reason];
  return saveVersion(before, after, [
    audit(
      actor,
      "STOCK_ADJUST",
      after,
      `Stock ${before.stock} → ${stock} (${reason}${adjustment.note ? ` : ${adjustment.note}` : ""})`,
      {
        stock: { from: before.stock, to: stock },
        reason: { from: null, to: adjustment.reason },
      },
    ),
  ]);
}

export async function archiveProduct(
  actor: Actor,
  id: string,
  expectedVersion: number,
): Promise<Product> {
  const before = await loadForChange(id, expectedVersion);
  if (before.status === "ARCHIVED") {
    throw conflict("ALREADY_ARCHIVED", "Ce produit est déjà archivé.");
  }
  const now = new Date().toISOString();
  const after: Product = {
    ...before,
    status: "ARCHIVED",
    archivedAt: now,
    version: before.version + 1,
    updatedAt: now,
  };
  return saveVersion(before, after, [
    audit(actor, "ARCHIVE", after, `Archivage de « ${after.name} »`),
  ]);
}

export async function restoreProduct(
  actor: Actor,
  id: string,
  expectedVersion: number,
): Promise<Product> {
  const before = await loadForChange(id, expectedVersion);
  if (before.status !== "ARCHIVED") {
    throw conflict("NOT_ARCHIVED", "Ce produit n'est pas archivé.");
  }
  const { archivedAt: _archivedAt, ...rest } = before;
  const after: Product = {
    ...rest,
    // Back as a draft: it is checked again before going on sale.
    status: "DRAFT",
    version: before.version + 1,
    updatedAt: new Date().toISOString(),
  };
  return saveVersion(before, after, [
    audit(
      actor,
      "RESTORE",
      after,
      `Restauration de « ${after.name} » en brouillon`,
    ),
  ]);
}

export async function deleteProduct(actor: Actor, id: string): Promise<void> {
  const product = await findProduct(id);
  if (!product) throw productNotFound();

  const usage = await countProductUsage(id);
  if (usage.carts > 0 || usage.wishlists > 0) {
    throw conflict(
      "PRODUCT_IN_USE",
      `Ce produit est encore dans ${usage.carts} panier(s) et ${usage.wishlists} wishlist(s). Archivez-le plutôt.`,
    );
  }

  await run([
    {
      tag: "product",
      item: {
        Delete: {
          TableName: table("Products"),
          Key: { id },
          ConditionExpression: "version = :expected",
          ExpressionAttributeValues: { ":expected": product.version },
        },
      },
    },
    releaseUniqueOp("sku-old", skuKey(product.sku)),
    releaseUniqueOp("slug-old", slugKey(product.slug)),
    ...statsOps(statsDelta(product, null)),
    audit(
      actor,
      "DELETE",
      product,
      `Suppression définitive de « ${product.name} » (${product.sku}, ${formatPrice(product.priceInCents)})`,
    ),
  ]);
}
