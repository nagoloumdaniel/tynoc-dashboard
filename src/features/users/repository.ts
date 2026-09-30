import "server-only";
import { randomUUID } from "node:crypto";
import {
  BatchWriteCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import {
  type TaggedItem,
  transact,
  TransactionConditionError,
} from "@/lib/aws/transaction";
import { conflict } from "@/lib/errors";
import {
  USER_LIST_FIELDS,
  type UserListItem,
  type UserRecord,
  type UserRole,
  type UserStatus,
} from "./types";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailKey = (email: string) => `EMAIL#${normalizeEmail(email)}`;

export const emailTaken = () =>
  conflict("EMAIL_TAKEN", "Cet email est déjà utilisé.");

export async function findUserById(id: string): Promise<UserRecord | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Users"),
      Key: { id },
      ConsistentRead: true,
    }),
  );
  return (Item as UserRecord | undefined) ?? null;
}

// Goes through the uniqueness guard: strongly consistent, unlike a GSI query.
export async function findUserByEmail(
  email: string,
): Promise<UserRecord | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Uniques"),
      Key: { pk: emailKey(email) },
      ConsistentRead: true,
    }),
  );
  return Item ? findUserById(Item.userId as string) : null;
}

/**
 * Creates a user with its email reservation and the users counter.
 * `extraOps` (e.g. an audit entry) join the same transaction.
 */
export async function createUser(
  input: {
    name: string;
    email: string;
    role: UserRole;
    status?: UserStatus;
    passwordHash?: string;
    phone?: string;
    mustChangePassword?: boolean;
  },
  extraOps: (user: UserRecord) => TaggedItem[] = () => [],
): Promise<UserRecord> {
  const now = new Date().toISOString();
  const user: UserRecord = {
    id: `usr_${randomUUID()}`,
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    phone: input.phone,
    role: input.role,
    status: input.status ?? "ACTIVE",
    passwordHash: input.passwordHash,
    mustChangePassword: input.mustChangePassword,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };

  try {
    await transact([
      {
        tag: "user",
        item: {
          Put: {
            TableName: table("Users"),
            Item: user,
            ConditionExpression: "attribute_not_exists(id)",
          },
        },
      },
      reserveEmailOp(user.email, user.id),
      usersCounterOp(1),
      ...extraOps(user),
    ]);
  } catch (error) {
    if (
      error instanceof TransactionConditionError &&
      error.failedTags.includes("email")
    ) {
      throw emailTaken();
    }
    throw error;
  }
  return user;
}

export function reserveEmailOp(email: string, userId: string): TaggedItem {
  return {
    tag: "email",
    item: {
      Put: {
        TableName: table("Uniques"),
        Item: { pk: emailKey(email), userId },
        ConditionExpression: "attribute_not_exists(pk)",
      },
    },
  };
}

export function releaseEmailOp(email: string): TaggedItem {
  return {
    tag: "email-old",
    item: {
      Delete: { TableName: table("Uniques"), Key: { pk: emailKey(email) } },
    },
  };
}

export function usersCounterOp(change: number): TaggedItem {
  return {
    tag: "stats",
    item: {
      Update: {
        TableName: table("Stats"),
        Key: { pk: "GLOBAL" },
        UpdateExpression: "ADD totalUsers :change",
        ExpressionAttributeValues: { ":change": change },
      },
    },
  };
}

/** Saves a new version of a user, guarded by its current version. */
export function putUserOp(
  user: UserRecord,
  expectedVersion: number,
): TaggedItem {
  return {
    tag: "user",
    item: {
      Put: {
        TableName: table("Users"),
        Item: user,
        ConditionExpression: "version = :expected",
        ExpressionAttributeValues: { ":expected": expectedVersion },
      },
    },
  };
}

export async function setPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table("Users"),
      Key: { id: userId },
      UpdateExpression:
        "SET passwordHash = :hash, updatedAt = :now ADD version :one",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: {
        ":hash": passwordHash,
        ":now": new Date().toISOString(),
        ":one": 1,
      },
    }),
  );
}

export async function markLogin(userId: string, at: string): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table("Users"),
      Key: { id: userId },
      UpdateExpression: "SET lastLoginAt = :at",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: { ":at": at },
    }),
  );
}

/** Every user of one status, list fields only (index byStatus). */
export async function queryUsersByStatus(
  status: UserStatus,
): Promise<UserListItem[]> {
  const names = Object.fromEntries(
    USER_LIST_FIELDS.map((field) => [`#${field}`, field]),
  );
  const items: UserListItem[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Users"),
        IndexName: "byStatus",
        KeyConditionExpression: "#status = :status",
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: { ":status": status },
        ProjectionExpression: Object.keys(names).join(", "),
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items ?? []) as UserListItem[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

export async function countActiveSuperAdmins(): Promise<number> {
  let count = 0;
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Users"),
        IndexName: "byRole",
        KeyConditionExpression: "#role = :role",
        FilterExpression: "#status = :active",
        ExpressionAttributeNames: { "#role": "role", "#status": "status" },
        ExpressionAttributeValues: {
          ":role": "SUPER_ADMIN",
          ":active": "ACTIVE",
        },
        Select: "COUNT",
        ExclusiveStartKey: startKey,
      }),
    );
    count += page.Count ?? 0;
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return count;
}

async function userItemKeys(
  tableKey: "Carts" | "Wishlists",
  userId: string,
): Promise<{ userId: string; productId: string }[]> {
  const keys: { userId: string; productId: string }[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table(tableKey),
        KeyConditionExpression: "userId = :id",
        ExpressionAttributeValues: { ":id": userId },
        ProjectionExpression: "userId, productId",
        ExclusiveStartKey: startKey,
      }),
    );
    keys.push(
      ...((page.Items ?? []) as { userId: string; productId: string }[]),
    );
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return keys;
}

export async function countUserItems(userId: string) {
  const [cart, wishlist] = await Promise.all([
    userItemKeys("Carts", userId),
    userItemKeys("Wishlists", userId),
  ]);
  return { cartItems: cart.length, wishlistItems: wishlist.length };
}

/** Empties a user's cart and wishlist (anonymisation). */
export async function deleteUserItems(userId: string): Promise<void> {
  for (const tableKey of ["Carts", "Wishlists"] as const) {
    const keys = await userItemKeys(tableKey, userId);
    for (let i = 0; i < keys.length; i += 25) {
      let pending: Record<string, unknown>[] | undefined = keys
        .slice(i, i + 25)
        .map((Key) => ({ DeleteRequest: { Key } }));
      while (pending?.length) {
        const result = await db().send(
          new BatchWriteCommand({
            RequestItems: { [table(tableKey)]: pending },
          }),
        );
        pending = result.UnprocessedItems?.[table(tableKey)] as
          Record<string, unknown>[] | undefined;
      }
    }
  }
}
