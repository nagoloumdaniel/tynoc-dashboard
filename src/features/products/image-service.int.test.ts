import { randomUUID } from "node:crypto";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { beforeAll, describe, expect, it } from "vitest";
import { createCategory } from "@/features/categories/service";
import { ROOT_PARENT } from "@/features/categories/types";
import { imageStorage, s3 } from "@/lib/aws/s3";
import type { Session } from "@/lib/auth/session";
import {
  attachImage,
  removeImage,
  reorderImages,
  requestImageUpload,
} from "./image-service";
import { MAX_IMAGES } from "./images";
import { createProduct, deleteProduct, getProduct } from "./service";
import type { Product } from "./types";

const actor: Session = {
  userId: "usr_test",
  email: "admin@example.com",
  name: "Admin",
  role: "SUPER_ADMIN",
};

let categoryId: string;

beforeAll(async () => {
  categoryId = (
    await createCategory(actor, {
      name: "Images",
      slug: `images-${randomUUID().slice(0, 8)}`,
      description: undefined,
      parentId: ROOT_PARENT,
      sortOrder: 1,
      isActive: true,
    })
  ).id;
});

function newProduct() {
  const id = randomUUID().slice(0, 8).toUpperCase();
  return createProduct(actor, {
    name: `Vase ${id}`,
    slug: `vase-${id.toLowerCase()}`,
    sku: `IMG-${id}`,
    description: undefined,
    categoryId,
    priceInCents: 1000,
    salePriceInCents: undefined,
    stock: 1,
    lowStockThreshold: 0,
    status: "DRAFT",
  });
}

/**
 * What the browser does with the presigned POST. A different `type` plays a
 * tampered form: S3 reads the Content-Type field, not the blob's type.
 */
async function upload(
  target: { url: string; fields: Record<string, string> },
  type = "image/png",
  bytes = 64,
) {
  const form = new FormData();
  for (const [name, value] of Object.entries(target.fields)) {
    form.append(name, value);
  }
  form.set("Content-Type", type);
  form.append("file", new Blob([new Uint8Array(bytes)], { type }));
  return fetch(target.url, { method: "POST", body: form });
}

async function uploadAndAttach(product: Product) {
  const target = await requestImageUpload(actor, product.id, {
    type: "image/png",
    size: 64,
  });
  expect((await upload(target)).ok).toBe(true);
  return attachImage(actor, product.id, product.version, target.key);
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

describe("product images", () => {
  it("uploads with a presigned POST, attaches and serves the image publicly", async () => {
    const product = await newProduct();
    const after = await uploadAndAttach(product);

    expect(after.imageKeys).toHaveLength(1);
    expect(after.version).toBe(product.version + 1);
    const key = after.imageKeys[0]!;
    const response = await fetch(`${imageStorage()!.publicUrl}/${key}`);
    expect(response.status).toBe(200);
  });

  it("lets S3 refuse files outside the signed conditions", async () => {
    const product = await newProduct();
    const target = await requestImageUpload(actor, product.id, {
      type: "image/png",
      size: 64,
    });
    expect((await upload(target, "text/html")).ok).toBe(false);
    expect((await upload(target, "image/png", 5 * 1024 * 1024 + 1)).ok).toBe(
      false,
    );
  });

  it("refuses keys it did not issue for the product, or not uploaded yet", async () => {
    const product = await newProduct();
    const other = await newProduct();
    const foreign = await requestImageUpload(actor, other.id, {
      type: "image/png",
      size: 64,
    });
    await upload(foreign);
    await expect(
      attachImage(actor, product.id, product.version, foreign.key),
    ).rejects.toMatchObject({ code: "IMAGE_INVALID" });

    const pending = await requestImageUpload(actor, product.id, {
      type: "image/png",
      size: 64,
    });
    await expect(
      attachImage(actor, product.id, product.version, pending.key),
    ).rejects.toMatchObject({ code: "IMAGE_NOT_UPLOADED" });
  });

  it("refuses wrong files and a ninth image before signing", async () => {
    const product = await newProduct();
    await expect(
      requestImageUpload(actor, product.id, { type: "image/gif", size: 64 }),
    ).rejects.toMatchObject({ code: "IMAGE_INVALID" });

    let current = product;
    for (let i = 0; i < MAX_IMAGES; i++)
      current = await uploadAndAttach(current);
    await expect(
      requestImageUpload(actor, product.id, { type: "image/png", size: 64 }),
    ).rejects.toMatchObject({ code: "TOO_MANY_IMAGES" });
  });

  it("reorders, removes (and deletes the file) with version checks", async () => {
    let product = await uploadAndAttach(await newProduct());
    product = await uploadAndAttach(product);
    const [first, second] = product.imageKeys as [string, string];

    product = await reorderImages(actor, product.id, product.version, [
      second,
      first,
    ]);
    expect(product.imageKeys).toEqual([second, first]);
    await expect(
      reorderImages(actor, product.id, product.version, [first]),
    ).rejects.toMatchObject({ code: "IMAGE_INVALID" });
    await expect(
      removeImage(actor, product.id, product.version - 1, first),
    ).rejects.toMatchObject({ code: "VERSION_CONFLICT" });

    product = await removeImage(actor, product.id, product.version, first);
    expect(product.imageKeys).toEqual([second]);
    expect(await exists(first)).toBe(false);
    expect(await exists(second)).toBe(true);
  });

  it("deletes the files with the product", async () => {
    const product = await uploadAndAttach(await newProduct());
    const key = product.imageKeys[0]!;
    await deleteProduct(actor, product.id);
    expect(await getProduct(product.id)).toBeNull();
    expect(await exists(key)).toBe(false);
  });
});
