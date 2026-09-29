import "server-only";
import { randomUUID } from "node:crypto";
import { type AuditAction, auditOp } from "@/lib/audit/audit-log";
import { table } from "@/lib/aws/dynamodb";
import {
  type TaggedItem,
  transact,
  TransactionConditionError,
} from "@/lib/aws/transaction";
import type { Session } from "@/lib/auth/session";
import { AppError, conflict, notFound } from "@/lib/errors";
import {
  categorySlugKey,
  categoryStatsKey,
  countCategoryProducts,
  findCategory,
  queryAllCategories,
  queryChildren,
  readCategoryCounts,
} from "./repository";
import type { CategoryInput } from "./schemas";
import {
  buildCategoryTree,
  type CategoryNode,
  type CategoryOption,
  categoryLabels,
  categoryOptions,
  isUsable,
} from "./tree";
import { type Category, isRoot, ROOT_PARENT } from "./types";

type Actor = Session;

const ERRORS = {
  slug: () =>
    conflict("CATEGORY_SLUG_TAKEN", "Ce slug de catégorie est déjà utilisé."),
  category: () =>
    conflict(
      "VERSION_CONFLICT",
      "Cette catégorie a été modifiée par quelqu'un d'autre. Rechargez la page.",
    ),
} as const;

const notFoundError = () =>
  notFound("CATEGORY_NOT_FOUND", "La catégorie demandée est introuvable.");

const invalidParent = () =>
  new AppError(
    "PARENT_INVALID",
    400,
    "Choisissez une catégorie principale existante.",
  );

async function run(items: TaggedItem[]) {
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

const versionOf = (category: Category) => category.version ?? 1;

/** Optimistic lock that also accepts categories created before `version`. */
function versionCondition(expected: number) {
  return {
    ConditionExpression:
      expected === 1
        ? "attribute_not_exists(version) OR version = :expected"
        : "version = :expected",
    ExpressionAttributeValues: { ":expected": expected },
  };
}

function audit(
  actor: Actor,
  action: AuditAction,
  category: Category,
  summary: string,
  changes?: Record<string, { from: unknown; to: unknown }>,
) {
  return auditOp({
    actorId: actor.userId,
    actorEmail: actor.email,
    action,
    entityType: "CATEGORY",
    entityId: category.id,
    summary,
    changes,
  });
}

async function assertValidParent(parentId: string, selfId?: string) {
  if (parentId === ROOT_PARENT) return;
  if (parentId === selfId) throw invalidParent();
  const parent = await findCategory(parentId);
  if (!parent || !isRoot(parent)) throw invalidParent();
}

async function loadForChange(id: string, expectedVersion: number) {
  const category = await findCategory(id);
  if (!category) throw notFoundError();
  if (versionOf(category) !== expectedVersion) throw ERRORS.category();
  return category;
}

// ---- Queries -----------------------------------------------------------------

export const getCategory = findCategory;

export async function listCategoryTree(): Promise<CategoryNode[]> {
  const categories = await queryAllCategories();
  const counts = await readCategoryCounts(categories.map((c) => c.id));
  return buildCategoryTree(categories, counts);
}

/** Categories a product can be assigned to, labelled "Parent › Child". */
export async function listUsableCategoryOptions(): Promise<CategoryOption[]> {
  return categoryOptions(buildCategoryTree(await queryAllCategories(), {}));
}

/** "Parent › Child" name of every category, inactive ones included. */
export async function listCategoryLabels(): Promise<Map<string, string>> {
  return categoryLabels(buildCategoryTree(await queryAllCategories(), {}));
}

export async function isCategoryUsable(id: string): Promise<boolean> {
  const category = await findCategory(id);
  if (!category) return false;
  const parent = isRoot(category)
    ? null
    : await findCategory(category.parentId);
  return isUsable(category, parent);
}

// ---- Commands ----------------------------------------------------------------

export async function createCategory(
  actor: Actor,
  input: CategoryInput,
  { id }: { id?: string } = {},
): Promise<Category> {
  await assertValidParent(input.parentId);
  const now = new Date().toISOString();
  const category: Category = {
    ...input,
    id: id ?? `cat_${randomUUID().slice(0, 8)}`,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await run([
    {
      tag: "category",
      item: {
        Put: {
          TableName: table("Categories"),
          Item: category,
          ConditionExpression: "attribute_not_exists(id)",
        },
      },
    },
    {
      tag: "slug",
      item: {
        Put: {
          TableName: table("Uniques"),
          Item: { pk: categorySlugKey(category.slug), categoryId: category.id },
          ConditionExpression: "attribute_not_exists(pk)",
        },
      },
    },
    {
      tag: "stats",
      item: {
        Update: {
          TableName: table("Stats"),
          Key: { pk: "GLOBAL" },
          UpdateExpression: "ADD totalCategories :one",
          ExpressionAttributeValues: { ":one": 1 },
        },
      },
    },
    audit(
      actor,
      "CREATE",
      category,
      `Création de la catégorie « ${category.name} »`,
    ),
  ]);
  return category;
}

const TRACKED_FIELDS = [
  "name",
  "slug",
  "description",
  "parentId",
  "sortOrder",
  "isActive",
] as const;

async function saveVersion(
  actor: Actor,
  before: Category,
  after: Category,
  action: AuditAction,
  summary: string,
) {
  const changes = Object.fromEntries(
    TRACKED_FIELDS.filter((field) => before[field] !== after[field]).map(
      (field) => [
        field,
        { from: before[field] ?? null, to: after[field] ?? null },
      ],
    ),
  );

  const slugOps: TaggedItem[] =
    after.slug === before.slug
      ? []
      : [
          {
            tag: "slug-old",
            item: {
              Delete: {
                TableName: table("Uniques"),
                Key: { pk: categorySlugKey(before.slug) },
              },
            },
          },
          {
            tag: "slug",
            item: {
              Put: {
                TableName: table("Uniques"),
                Item: { pk: categorySlugKey(after.slug), categoryId: after.id },
                ConditionExpression: "attribute_not_exists(pk)",
              },
            },
          },
        ];

  await run([
    {
      tag: "category",
      item: {
        Put: {
          TableName: table("Categories"),
          Item: after,
          ...versionCondition(versionOf(before)),
        },
      },
    },
    ...slugOps,
    audit(actor, action, after, summary, changes),
  ]);
  return after;
}

export async function updateCategory(
  actor: Actor,
  id: string,
  expectedVersion: number,
  input: CategoryInput,
): Promise<Category> {
  const before = await loadForChange(id, expectedVersion);

  if (input.parentId !== before.parentId) {
    // A parent stays top-level while it has children: one level only.
    if (isRoot(before) && (await queryChildren(id)).length > 0) {
      throw conflict(
        "CATEGORY_HAS_CHILDREN",
        "Cette catégorie a des sous-catégories : elle doit rester principale.",
      );
    }
    await assertValidParent(input.parentId, id);
  }

  const after: Category = {
    ...before,
    ...input,
    version: versionOf(before) + 1,
    updatedAt: new Date().toISOString(),
  };
  return saveVersion(
    actor,
    before,
    after,
    "UPDATE",
    `Modification de la catégorie « ${after.name} »`,
  );
}

export async function setCategoryActive(
  actor: Actor,
  id: string,
  expectedVersion: number,
  isActive: boolean,
): Promise<Category> {
  const before = await loadForChange(id, expectedVersion);
  const after: Category = {
    ...before,
    isActive,
    version: versionOf(before) + 1,
    updatedAt: new Date().toISOString(),
  };
  return saveVersion(
    actor,
    before,
    after,
    isActive ? "ACTIVATE" : "DEACTIVATE",
    `${isActive ? "Activation" : "Désactivation"} de la catégorie « ${after.name} »`,
  );
}

export async function deleteCategory(
  actor: Actor,
  id: string,
  expectedVersion: number,
): Promise<void> {
  const category = await loadForChange(id, expectedVersion);

  if ((await queryChildren(id)).length > 0) {
    throw conflict(
      "CATEGORY_HAS_CHILDREN",
      "Supprimez ou déplacez d'abord ses sous-catégories.",
    );
  }
  const products = await countCategoryProducts(id);
  if (products > 0) {
    throw conflict(
      "CATEGORY_NOT_EMPTY",
      `Cette catégorie contient ${products} produit(s). Déplacez-les ou désactivez la catégorie.`,
    );
  }

  await run([
    {
      tag: "category",
      item: {
        Delete: {
          TableName: table("Categories"),
          Key: { id },
          ...versionCondition(expectedVersion),
        },
      },
    },
    {
      tag: "slug-old",
      item: {
        Delete: {
          TableName: table("Uniques"),
          Key: { pk: categorySlugKey(category.slug) },
        },
      },
    },
    {
      tag: "stats",
      item: {
        Update: {
          TableName: table("Stats"),
          Key: { pk: "GLOBAL" },
          UpdateExpression: "ADD totalCategories :minusOne",
          ExpressionAttributeValues: { ":minusOne": -1 },
        },
      },
    },
    {
      tag: "stats",
      item: {
        Delete: {
          TableName: table("Stats"),
          Key: { pk: categoryStatsKey(id) },
        },
      },
    },
    audit(
      actor,
      "DELETE",
      category,
      `Suppression de la catégorie « ${category.name} »`,
    ),
  ]);
}
