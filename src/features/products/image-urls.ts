import "server-only";
import { imageStorage } from "@/lib/aws/s3";
import { imageUrl } from "./images";

/** Public URL of the main (first) image, or null. */
export function mainImageUrl(product: {
  imageKeys?: readonly string[];
}): string | null {
  const key = product.imageKeys?.[0];
  const storage = imageStorage();
  return key && storage ? imageUrl(storage.publicUrl, key) : null;
}

export const imagesEnabled = () => imageStorage() !== null;

export function imageUrls(keys: readonly string[]): string[] {
  const storage = imageStorage();
  return storage ? keys.map((key) => imageUrl(storage.publicUrl, key)) : [];
}
