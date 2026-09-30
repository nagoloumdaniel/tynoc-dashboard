import "server-only";
import { randomUUID } from "node:crypto";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { imageStorage, s3 } from "@/lib/aws/s3";
import { AppError, conflict } from "@/lib/errors";
import {
  imageKey,
  isImageType,
  isProductImageKey,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
  validateImageFile,
} from "./images";
import { deleteImageFiles } from "./image-files";
import { findProduct } from "./repository";
import { type Actor, audit, loadForChange, saveVersion } from "./service";
import type { Product } from "./types";

const UPLOAD_SECONDS = 300;

function storage() {
  const settings = imageStorage();
  if (!settings) {
    throw new AppError(
      "IMAGES_DISABLED",
      503,
      "Le stockage des images n'est pas configuré.",
    );
  }
  return settings;
}

const invalid = (message: string) =>
  new AppError("IMAGE_INVALID", 400, message);

function assertEditable(product: Product) {
  if (product.status === "ARCHIVED") {
    throw conflict(
      "PRODUCT_ARCHIVED",
      "Restaurez le produit avant de modifier ses images.",
    );
  }
}

const tooMany = () =>
  conflict("TOO_MANY_IMAGES", `${MAX_IMAGES} images maximum par produit.`);

/**
 * Signs a one-off POST straight from the browser to S3. The signed policy
 * pins the key, the type and 1 byte – 5 MB, so S3 itself refuses anything
 * else; the server never handles the file.
 */
export async function requestImageUpload(
  _actor: Actor,
  productId: string,
  file: { type: string; size: number },
): Promise<{ url: string; fields: Record<string, string>; key: string }> {
  const { bucket } = storage();
  const product = await findProduct(productId);
  if (!product) {
    throw new AppError("PRODUCT_NOT_FOUND", 404, "Produit introuvable.");
  }
  assertEditable(product);
  if (product.imageKeys.length >= MAX_IMAGES) throw tooMany();
  const problem = validateImageFile(file);
  if (problem || !isImageType(file.type)) throw invalid(problem ?? "");

  const key = imageKey(productId, randomUUID(), file.type);
  const { url, fields } = await createPresignedPost(s3(), {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ["content-length-range", 1, MAX_IMAGE_BYTES],
      ["eq", "$Content-Type", file.type],
    ],
    Fields: { "Content-Type": file.type },
    Expires: UPLOAD_SECONDS,
  });
  return { url, fields, key };
}

async function uploaded(bucket: string, key: string) {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Adds an uploaded file to the product, after checking it is really there. */
export async function attachImage(
  actor: Actor,
  productId: string,
  expectedVersion: number,
  key: string,
): Promise<Product> {
  const { bucket } = storage();
  const before = await loadForChange(productId, expectedVersion);
  assertEditable(before);
  if (!isProductImageKey(productId, key) || before.imageKeys.includes(key)) {
    throw invalid("Image inconnue pour ce produit.");
  }
  if (before.imageKeys.length >= MAX_IMAGES) throw tooMany();
  if (!(await uploaded(bucket, key))) {
    throw new AppError(
      "IMAGE_NOT_UPLOADED",
      409,
      "L'envoi de l'image n'est pas terminé. Réessayez.",
    );
  }

  const after = nextVersion(before, [...before.imageKeys, key]);
  return saveVersion(before, after, [
    audit(actor, "UPDATE", after, `Image ajoutée à « ${after.name} »`, {
      images: { from: before.imageKeys.length, to: after.imageKeys.length },
    }),
  ]);
}

/** New order of the same images; the first one is the main image. */
export async function reorderImages(
  actor: Actor,
  productId: string,
  expectedVersion: number,
  keys: string[],
): Promise<Product> {
  const before = await loadForChange(productId, expectedVersion);
  assertEditable(before);
  const same =
    keys.length === before.imageKeys.length &&
    new Set(keys).size === keys.length &&
    keys.every((key) => before.imageKeys.includes(key));
  if (!same) throw invalid("La liste des images a changé. Rechargez la page.");

  const after = nextVersion(before, keys);
  return saveVersion(before, after, [
    audit(
      actor,
      "UPDATE",
      after,
      `Ordre des images de « ${after.name} » modifié`,
    ),
  ]);
}

export async function removeImage(
  actor: Actor,
  productId: string,
  expectedVersion: number,
  key: string,
): Promise<Product> {
  storage();
  const before = await loadForChange(productId, expectedVersion);
  assertEditable(before);
  if (!before.imageKeys.includes(key)) {
    throw invalid("Cette image n'appartient plus au produit.");
  }

  const after = nextVersion(
    before,
    before.imageKeys.filter((k) => k !== key),
  );
  await saveVersion(before, after, [
    audit(actor, "UPDATE", after, `Image retirée de « ${after.name} »`, {
      images: { from: before.imageKeys.length, to: after.imageKeys.length },
    }),
  ]);
  // Only after the transaction succeeded.
  await deleteImageFiles(after.id, [key]);
  return after;
}

function nextVersion(before: Product, imageKeys: string[]): Product {
  return {
    ...before,
    imageKeys,
    version: before.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
