import "server-only";
import { auditOp } from "@/lib/audit/audit-log";
import { table } from "@/lib/aws/dynamodb";
import {
  type TaggedItem,
  transact,
  TransactionConditionError,
} from "@/lib/aws/transaction";
import type { Session } from "@/lib/auth/session";
import { notFound } from "@/lib/errors";
import {
  queryAllCartLines,
  queryAllWishlistLines,
  queryUserLines,
  readCustomers,
  readProducts,
} from "./repository";
import type { CartListQuery, WishlistListQuery } from "./schemas";
import {
  availability,
  filterSortPaginateCarts,
  filterSortPaginateWishlists,
  groupByUser,
  summarizeCart,
  summarizeWishlist,
  unitPrice,
} from "./summary";
import type { CartLine, WishlistLine } from "./types";

type Kind = "CART" | "WISHLIST";

const KIND = {
  CART: { table: "Carts", counter: "cartItems", label: "du panier" },
  WISHLIST: {
    table: "Wishlists",
    counter: "wishlistItems",
    label: "de la wishlist",
  },
} as const;

// ---- Lists -------------------------------------------------------------------

export async function listCarts(query: CartListQuery) {
  let lines = await queryAllCartLines();
  if (query.product) {
    const owners = new Set(
      lines.filter((l) => l.productId === query.product).map((l) => l.userId),
    );
    lines = lines.filter((l) => owners.has(l.userId));
  }
  const groups = groupByUser(lines);
  const [products, customers] = await Promise.all([
    readProducts(lines.map((l) => l.productId)),
    readCustomers([...groups.keys()]),
  ]);
  const now = new Date();
  const rows = [...groups].map(([userId, userLines]) => ({
    ...summarizeCart(userId, userLines, products, now),
    customer: customers.get(userId) ?? null,
  }));
  return filterSortPaginateCarts(rows, query);
}

export async function listWishlists(query: WishlistListQuery) {
  const groups = groupByUser(await queryAllWishlistLines());
  const customers = await readCustomers([...groups.keys()]);
  const rows = [...groups].map(([userId, lines]) => ({
    ...summarizeWishlist(userId, lines),
    customer: customers.get(userId) ?? null,
  }));
  return filterSortPaginateWishlists(rows, query);
}

// ---- Details -----------------------------------------------------------------

export async function getCart(userId: string) {
  const lines = await queryUserLines<CartLine>("Carts", userId);
  const [products, customers] = await Promise.all([
    readProducts(lines.map((l) => l.productId)),
    readCustomers([userId]),
  ]);
  const items = lines
    .map((line) => {
      const product = products.get(line.productId);
      return {
        line,
        product,
        availability: availability(product, line.quantity),
        subtotalInCents: product ? unitPrice(product) * line.quantity : 0,
      };
    })
    .sort((a, b) => b.line.updatedAt.localeCompare(a.line.updatedAt));
  return {
    customer: customers.get(userId) ?? null,
    items,
    summary: summarizeCart(userId, lines, products),
  };
}

export async function getWishlist(userId: string) {
  const lines = await queryUserLines<WishlistLine>("Wishlists", userId);
  const [products, customers] = await Promise.all([
    readProducts(lines.map((l) => l.productId)),
    readCustomers([userId]),
  ]);
  const items = lines
    .map((line) => {
      const product = products.get(line.productId);
      return { line, product, availability: availability(product) };
    })
    .sort((a, b) => b.line.addedAt.localeCompare(a.line.addedAt));
  return { customer: customers.get(userId) ?? null, items };
}

// ---- Admin actions -----------------------------------------------------------

function deleteLineOp(
  kind: Kind,
  userId: string,
  productId: string,
): TaggedItem {
  return {
    tag: "line",
    item: {
      Delete: {
        TableName: table(KIND[kind].table),
        Key: { userId, productId },
        // A line removed meanwhile (by the customer) is reported, not ignored.
        ConditionExpression: "attribute_exists(userId)",
      },
    },
  };
}

function counterOp(kind: Kind, change: number): TaggedItem {
  const counter = KIND[kind].counter;
  return {
    tag: "stats",
    item: {
      Update: {
        TableName: table("Stats"),
        Key: { pk: "GLOBAL" },
        UpdateExpression: `ADD ${counter} :change`,
        ExpressionAttributeValues: { ":change": change },
      },
    },
  };
}

function audit(
  actor: Session,
  kind: Kind,
  action: "REMOVE_ITEM" | "EMPTY",
  userId: string,
  summary: string,
) {
  return auditOp({
    actorId: actor.userId,
    actorEmail: actor.email,
    action,
    entityType: kind,
    entityId: userId,
    summary,
  });
}

async function run(items: TaggedItem[], kind: Kind) {
  try {
    await transact(items);
  } catch (error) {
    if (
      error instanceof TransactionConditionError &&
      error.failedTags.includes("line")
    ) {
      throw notFound(
        "ITEM_NOT_FOUND",
        `Cet article n'est plus dans ${kind === "CART" ? "le panier" : "la wishlist"}.`,
      );
    }
    throw error;
  }
}

export async function removeLine(
  actor: Session,
  kind: Kind,
  userId: string,
  productId: string,
): Promise<void> {
  const products = await readProducts([productId]);
  const name = products.get(productId)?.name ?? productId;
  await run(
    [
      deleteLineOp(kind, userId, productId),
      counterOp(kind, -1),
      audit(
        actor,
        kind,
        "REMOVE_ITEM",
        userId,
        `« ${name} » retiré ${KIND[kind].label}`,
      ),
    ],
    kind,
  );
}

// A transaction holds at most 100 operations: counter and audit take two.
const CHUNK = 90;

export async function emptyLines(
  actor: Session,
  kind: Kind,
  userId: string,
): Promise<number> {
  const lines = await queryUserLines<{ productId: string }>(
    KIND[kind].table,
    userId,
  );
  for (let i = 0; i < lines.length; i += CHUNK) {
    const chunk = lines.slice(i, i + CHUNK);
    const last = i + CHUNK >= lines.length;
    await run(
      [
        ...chunk.map((l) => deleteLineOp(kind, userId, l.productId)),
        counterOp(kind, -chunk.length),
        ...(last
          ? [
              audit(
                actor,
                kind,
                "EMPTY",
                userId,
                `${lines.length} article(s) retiré(s) : ${kind === "CART" ? "panier vidé" : "wishlist vidée"}`,
              ),
            ]
          : []),
      ],
      kind,
    );
  }
  return lines.length;
}
