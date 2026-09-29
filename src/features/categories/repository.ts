import "server-only";
import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import { failedTransactionItems } from "@/lib/aws/errors";
import { conflict } from "@/lib/errors";
import { type Category, ROOT_PARENT } from "./types";

export async function findCategory(id: string): Promise<Category | null> {
  const { Item } = await db().send(
    new GetCommand({ TableName: table("Categories"), Key: { id } }),
  );
  return (Item as Category | undefined) ?? null;
}

export async function listActiveCategories(): Promise<Category[]> {
  const items: Category[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Categories"),
        IndexName: "byParent",
        KeyConditionExpression: "parentId = :root",
        FilterExpression: "isActive = :active",
        ExpressionAttributeValues: { ":root": ROOT_PARENT, ":active": true },
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items ?? []) as Category[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

/** Top-level category; the management screen and sub-categories come in phase 4. */
export async function createCategory(input: {
  name: string;
  slug: string;
  sortOrder: number;
  isActive?: boolean;
}): Promise<Category> {
  const now = new Date().toISOString();
  const category: Category = {
    id: `cat_${input.slug}`,
    name: input.name,
    slug: input.slug,
    parentId: ROOT_PARENT,
    sortOrder: input.sortOrder,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: table("Categories"),
              Item: category,
              ConditionExpression: "attribute_not_exists(id)",
            },
          },
          {
            Put: {
              TableName: table("Uniques"),
              Item: {
                pk: `CATEGORY_SLUG#${category.slug}`,
                categoryId: category.id,
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Update: {
              TableName: table("Stats"),
              Key: { pk: "GLOBAL" },
              UpdateExpression: "ADD totalCategories :one",
              ExpressionAttributeValues: { ":one": 1 },
            },
          },
        ],
      }),
    );
  } catch (error) {
    const failed = failedTransactionItems(error);
    if (failed.includes(0) || failed.includes(1)) {
      throw conflict(
        "CATEGORY_SLUG_TAKEN",
        "Ce slug de catégorie est déjà utilisé.",
      );
    }
    throw error;
  }
  return category;
}
