"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, type FormActionState } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import { categoryFormSchema } from "./schemas";
import {
  createCategory,
  deleteCategory,
  setCategoryActive,
  updateCategory,
} from "./service";

export type CategoryField =
  "name" | "slug" | "description" | "parentId" | "sortOrder" | "isActive";

export type CategoryFormState = FormActionState<CategoryField>;

const FIELDS: CategoryField[] = [
  "name",
  "slug",
  "description",
  "parentId",
  "sortOrder",
  "isActive",
];

const FIELD_OF_ERROR: Record<string, CategoryField> = {
  CATEGORY_SLUG_TAKEN: "slug",
  PARENT_INVALID: "parentId",
  CATEGORY_HAS_CHILDREN: "parentId",
};

function readForm(formData: FormData) {
  return Object.fromEntries(
    FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  );
}

function refresh() {
  // Category names and choices appear on the product pages too.
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products", "layout");
}

async function save(
  formData: FormData,
  write: (
    input: z.output<typeof categoryFormSchema>,
  ) => Promise<{ id: string }>,
  message: string,
): Promise<CategoryFormState> {
  const values = readForm(formData);
  const parsed = categoryFormSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }
  try {
    const category = await write(parsed.data);
    refresh();
    return { ok: true, id: category.id, message };
  } catch (error) {
    const result = failure(error);
    const field = result.code ? FIELD_OF_ERROR[result.code] : undefined;
    return field
      ? { fieldErrors: { [field]: [result.message] }, values }
      : { message: result.message, values };
  }
}

export async function createCategoryAction(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireAdmin("categories:write");
  return save(
    formData,
    (input) => createCategory(session, input),
    "Catégorie créée.",
  );
}

export async function updateCategoryAction(
  _previous: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const session = await requireAdmin("categories:write");
  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version"));
  return save(
    formData,
    (input) => updateCategory(session, id, version, input),
    "Catégorie enregistrée.",
  );
}

export async function setCategoryActiveAction(
  id: string,
  version: number,
  isActive: boolean,
) {
  const session = await requireAdmin("categories:write");
  try {
    await setCategoryActive(session, id, version, isActive);
    refresh();
    return {
      ok: true as const,
      message: isActive ? "Catégorie activée." : "Catégorie désactivée.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteCategoryAction(id: string, version: number) {
  const session = await requireAdmin("categories:write");
  try {
    await deleteCategory(session, id, version);
    refresh();
    return { ok: true as const, message: "Catégorie supprimée." };
  } catch (error) {
    return failure(error);
  }
}
