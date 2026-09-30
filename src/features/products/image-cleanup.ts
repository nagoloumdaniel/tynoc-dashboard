import "server-only";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { imageStorage, s3 } from "@/lib/aws/s3";
import { deleteImageFiles } from "./image-files";
import { orphanKeys } from "./orphans";
import { queryProductsByStatus } from "./repository";
import type { ProductStatus } from "./types";

const STATUSES: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];
const DELETE_BATCH = 1000; // DeleteObjects limit

async function listUploads(bucket: string) {
  const objects: { key: string; lastModified?: Date }[] = [];
  let token: string | undefined;
  do {
    const page = await s3().send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: "products/",
        ContinuationToken: token,
      }),
    );
    for (const o of page.Contents ?? []) {
      if (o.Key) objects.push({ key: o.Key, lastModified: o.LastModified });
    }
    token = page.NextContinuationToken;
  } while (token);
  return objects;
}

/**
 * Deletes files under products/ older than a day that no product lists.
 * Products are read after the files, so an image attached in between is
 * seen as referenced.
 */
export async function cleanupOrphanImages(
  now = new Date(),
): Promise<{ scanned: number; deleted: number }> {
  const storage = imageStorage();
  if (!storage) return { scanned: 0, deleted: 0 };

  const objects = await listUploads(storage.bucket);
  const products = (
    await Promise.all(STATUSES.map(queryProductsByStatus))
  ).flat();
  const referenced = new Set(products.flatMap((p) => p.imageKeys ?? []));
  const orphans = orphanKeys(objects, referenced, now);

  for (let i = 0; i < orphans.length; i += DELETE_BATCH) {
    await deleteImageFiles("cleanup", orphans.slice(i, i + DELETE_BATCH));
  }
  return { scanned: objects.length, deleted: orphans.length };
}
