import "server-only";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { imageStorage, s3 } from "@/lib/aws/s3";

/**
 * Deletes image files once the product no longer lists them. Best effort:
 * a failure leaves an orphan file, never a product pointing at nothing.
 */
export async function deleteImageFiles(
  productId: string,
  keys: readonly string[],
): Promise<void> {
  const settings = imageStorage();
  if (!settings || keys.length === 0) return;
  try {
    await s3().send(
      new DeleteObjectsCommand({
        Bucket: settings.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  } catch (error) {
    console.error(
      "image delete failed",
      productId,
      error instanceof Error ? error.name : "unknown",
    );
  }
}
