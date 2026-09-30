"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { type ActionResult, failure } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import {
  attachImage,
  removeImage,
  reorderImages,
  requestImageUpload,
} from "./image-service";
import { MAX_IMAGES } from "./images";

// Server Actions are public endpoints: their arguments are checked too.
const id = z.string().min(1).max(100);
const version = z.number().int().min(1);
const key = z.string().min(1).max(300);

function refresh(productId: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
}

async function guarded<T>(
  parse: () => void,
  run: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    parse();
    return { ok: true, data: await run() };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { ok: false, message: "Requête invalide.", code: "BAD_REQUEST" };
    }
    return failure(error);
  }
}

export async function requestImageUploadAction(
  productId: string,
  file: { type: string; size: number },
) {
  const session = await requireAdmin("products:write");
  return guarded(
    () => {
      id.parse(productId);
      z.object({
        type: z.string().max(100),
        size: z.number().int().min(0),
      }).parse(file);
    },
    () => requestImageUpload(session, productId, file),
  );
}

export async function attachImageAction(
  productId: string,
  expectedVersion: number,
  imageKey: string,
) {
  const session = await requireAdmin("products:write");
  return guarded(
    () => {
      id.parse(productId);
      version.parse(expectedVersion);
      key.parse(imageKey);
    },
    async () => {
      const product = await attachImage(
        session,
        productId,
        expectedVersion,
        imageKey,
      );
      refresh(productId);
      return { version: product.version };
    },
  );
}

export async function reorderImagesAction(
  productId: string,
  expectedVersion: number,
  keys: string[],
) {
  const session = await requireAdmin("products:write");
  return guarded(
    () => {
      id.parse(productId);
      version.parse(expectedVersion);
      z.array(key).max(MAX_IMAGES).parse(keys);
    },
    async () => {
      const product = await reorderImages(
        session,
        productId,
        expectedVersion,
        keys,
      );
      refresh(productId);
      return { version: product.version };
    },
  );
}

export async function removeImageAction(
  productId: string,
  expectedVersion: number,
  imageKey: string,
) {
  const session = await requireAdmin("products:write");
  return guarded(
    () => {
      id.parse(productId);
      version.parse(expectedVersion);
      key.parse(imageKey);
    },
    async () => {
      const product = await removeImage(
        session,
        productId,
        expectedVersion,
        imageKey,
      );
      refresh(productId);
      return { version: product.version };
    },
  );
}
