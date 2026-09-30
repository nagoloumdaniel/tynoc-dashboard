import { cleanupOrphanImages } from "@/features/products/image-cleanup";
import { cronGuard } from "@/lib/cron";

/** Weekly deletion of uploads never attached to a product (vercel.json). */
export async function GET(request: Request) {
  const refused = cronGuard(request);
  if (refused) return refused;
  return Response.json({ ok: true, ...(await cleanupOrphanImages()) });
}
