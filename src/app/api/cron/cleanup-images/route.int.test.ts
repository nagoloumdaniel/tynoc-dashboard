import { randomUUID } from "node:crypto";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { describe, expect, it } from "vitest";
import { createCategory } from "@/features/categories/service";
import { ROOT_PARENT } from "@/features/categories/types";
import { cleanupOrphanImages } from "@/features/products/image-cleanup";
import {
  attachImage,
  requestImageUpload,
} from "@/features/products/image-service";
import { createProduct } from "@/features/products/service";
import { imageStorage, s3 } from "@/lib/aws/s3";
import type { Session } from "@/lib/auth/session";
import { GET } from "./route";

const actor: Session = {
  userId: "usr_test",
  email: "admin@example.com",
  name: "Admin",
  role: "SUPER_ADMIN",
};

async function upload(target: { url: string; fields: Record<string, string> }) {
  const form = new FormData();
  for (const [name, value] of Object.entries(target.fields)) {
    form.append(name, value);
  }
  form.append("file", new Blob([new Uint8Array(32)], { type: "image/png" }));
  expect((await fetch(target.url, { method: "POST", body: form })).ok).toBe(
    true,
  );
}

const exists = async (key: string) => {
  try {
    await s3().send(
      new HeadObjectCommand({ Bucket: imageStorage()!.bucket, Key: key }),
    );
    return true;
  } catch {
    return false;
  }
};

describe("orphan image cleanup", () => {
  it("refuses callers without the cron secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/cleanup-images"),
    );
    expect(response.status).toBe(401);
  });

  it("deletes old uploads no product lists and keeps attached images", async () => {
    const id = randomUUID().slice(0, 6).toUpperCase();
    const category = await createCategory(actor, {
      name: "Orphelines",
      slug: `orphelines-${id.toLowerCase()}`,
      description: undefined,
      parentId: ROOT_PARENT,
      sortOrder: 1,
      isActive: true,
    });
    const product = await createProduct(actor, {
      name: `Pot ${id}`,
      slug: `pot-${id.toLowerCase()}`,
      sku: `ORP-${id}`,
      description: undefined,
      categoryId: category.id,
      priceInCents: 500,
      salePriceInCents: undefined,
      stock: 3,
      lowStockThreshold: 0,
      status: "DRAFT",
    });
    const file = { type: "image/png", size: 32 };

    const kept = await requestImageUpload(actor, product.id, file);
    await upload(kept);
    await attachImage(actor, product.id, product.version, kept.key);

    const orphan = await requestImageUpload(actor, product.id, file);
    await upload(orphan); // Tab closed before the attach.

    // Today both are recent: nothing goes.
    await cleanupOrphanImages();
    expect(await exists(orphan.key)).toBe(true);

    // Two days later the orphan goes, the attached image stays.
    const later = new Date(Date.now() + 2 * 86_400_000);
    const result = await cleanupOrphanImages(later);
    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(await exists(orphan.key)).toBe(false);
    expect(await exists(kept.key)).toBe(true);
  });
});
