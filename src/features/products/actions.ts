"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, type FormActionState } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import {
  productCreateSchema,
  productUpdateSchema,
  stockAdjustmentSchema,
} from "./schemas";
import {
  adjustStock,
  archiveProduct,
  createProduct,
  deleteProduct,
  restoreProduct,
  updateProduct,
} from "./service";

export type ProductField =
  | "name"
  | "slug"
  | "sku"
  | "description"
  | "categoryId"
  | "price"
  | "salePrice"
  | "stock"
  | "lowStockThreshold"
  | "status";

export type ProductFormState = FormActionState<ProductField>;

const FORM_FIELDS: ProductField[] = [
  "name",
  "slug",
  "sku",
  "description",
  "categoryId",
  "price",
  "salePrice",
  "stock",
  "lowStockThreshold",
  "status",
];

// Business errors that belong to one field are shown under that field.
const FIELD_OF_ERROR: Record<string, ProductField> = {
  SKU_TAKEN: "sku",
  SLUG_TAKEN: "slug",
  CATEGORY_INVALID: "categoryId",
};

function readForm(formData: FormData) {
  return Object.fromEntries(
    FORM_FIELDS.map((field) => [field, String(formData.get(field) ?? "")]),
  );
}

function toFormError(
  error: unknown,
  values: Record<string, string>,
): ProductFormState {
  const result = failure(error);
  const field = result.code ? FIELD_OF_ERROR[result.code] : undefined;
  return field
    ? { fieldErrors: { [field]: [result.message] }, values }
    : { message: result.message, values };
}

function refresh(productId?: string) {
  revalidatePath("/admin/products");
  if (productId) revalidatePath(`/admin/products/${productId}`);
}

export async function createProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await requireAdmin("products:write");
  const values = readForm(formData);
  const parsed = productCreateSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    const product = await createProduct(session, parsed.data);
    refresh();
    return { ok: true, id: product.id, message: "Produit créé." };
  } catch (error) {
    return toFormError(error, values);
  }
}

export async function updateProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const session = await requireAdmin("products:write");
  const values = readForm(formData);
  const id = String(formData.get("id") ?? "");
  const version = Number(formData.get("version"));
  const parsed = productUpdateSchema.safeParse(values);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  }

  try {
    await updateProduct(session, id, version, parsed.data);
    refresh(id);
    return { ok: true, id, message: "Modifications enregistrées." };
  } catch (error) {
    return toFormError(error, values);
  }
}

// ---- Dialog actions: plain results, no form state ---------------------------

export type ActionOutcome =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

async function lifecycle(
  run: () => Promise<unknown>,
  productId: string,
  message: string,
): Promise<ActionOutcome> {
  try {
    await run();
    refresh(productId);
    return { ok: true, message };
  } catch (error) {
    return failure(error);
  }
}

export async function adjustStockAction(
  productId: string,
  version: number,
  input: Record<string, string>,
): Promise<ActionOutcome> {
  const session = await requireAdmin("products:write");
  const parsed = stockAdjustmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Vérifiez les champs du formulaire.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  return lifecycle(
    () => adjustStock(session, productId, version, parsed.data),
    productId,
    "Stock mis à jour.",
  );
}

export async function archiveProductAction(productId: string, version: number) {
  const session = await requireAdmin("products:write");
  return lifecycle(
    () => archiveProduct(session, productId, version),
    productId,
    "Produit archivé.",
  );
}

export async function restoreProductAction(productId: string, version: number) {
  const session = await requireAdmin("products:write");
  return lifecycle(
    () => restoreProduct(session, productId, version),
    productId,
    "Produit restauré en brouillon.",
  );
}

export async function deleteProductAction(productId: string) {
  const session = await requireAdmin("products:delete");
  return lifecycle(
    () => deleteProduct(session, productId),
    productId,
    "Produit supprimé définitivement.",
  );
}
