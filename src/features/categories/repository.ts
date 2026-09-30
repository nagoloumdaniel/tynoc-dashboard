import "server-only";
import {
  BatchGetCommand,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { db, table } from "@/lib/aws/dynamodb";
import { type Category, ROOT_PARENT } from "./types";

export const categorySlugKey = (slug: string) => `CATEGORY_SLUG#${slug}`;
export const categoryStatsKey = (id: string) => `CATEGORY#${id}`;

export async function findCategory(id: string): Promise<Category | null> {
  const { Item } = await db().send(
    new GetCommand({
      TableName: table("Categories"),
      Key: { id },
      ConsistentRead: true,
    }),
  );
  return (Item as Category | undefined) ?? null;
}

/** Categories with the given parent, via the byParent index. */
export async function queryChildren(parentId: string): Promise<Category[]> {
  const items: Category[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Categories"),
        IndexName: "byParent",
        KeyConditionExpression: "parentId = :parent",
        ExpressionAttributeValues: { ":parent": parentId },
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items ?? []) as Category[]));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

/** Every category: top-level ones, then their children in parallel. */
export async function queryAllCategories(): Promise<Category[]> {
  const roots = await queryChildren(ROOT_PARENT);
  const children = await Promise.all(
    roots.map((root) => queryChildren(root.id)),
  );
  return [...roots, ...children.flat()];
}

/** Products in a category, archived ones included (index byCategory). */
export async function countCategoryProducts(
  categoryId: string,
): Promise<number> {
  let count = 0;
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await db().send(
      new QueryCommand({
        TableName: table("Products"),
        IndexName: "byCategory",
        KeyConditionExpression: "categoryId = :id",
        ExpressionAttributeValues: { ":id": categoryId },
        Select: "COUNT",
        ExclusiveStartKey: startKey,
      }),
    );
    count += page.Count ?? 0;
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return count;
}

/** productCount of each category from the dashboard counters. */
export async function readCategoryCounts(
  ids: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (let i = 0; i < ids.length; i += 100) {
    let keys: Record<string, unknown>[] | undefined = ids
      .slice(i, i + 100)
      .map((id) => ({ pk: categoryStatsKey(id) }));
    // BatchGet may return part of the keys as unprocessed: retry them.
    while (keys?.length) {
      const result = await db().send(
        new BatchGetCommand({
          RequestItems: {
            [table("Stats")]: {
              Keys: keys,
              ProjectionExpression: "pk, productCount",
            },
          },
        }),
      );
      for (const item of result.Responses?.[table("Stats")] ?? []) {
        const id = String(item.pk).replace("CATEGORY#", "");
        counts[id] = Number(item.productCount ?? 0);
      }
      keys = result.UnprocessedKeys?.[table("Stats")]?.Keys as
        Record<string, unknown>[] | undefined;
    }
  }
  return counts;
}
