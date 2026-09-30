import { writeSnapshot } from "@/features/dashboard/service";
import { cronGuard } from "@/lib/cron";

/** Daily copy of the dashboard counters (Vercel Cron, see vercel.json). */
export async function GET(request: Request) {
  const refused = cronGuard(request);
  if (refused) return refused;
  const date = await writeSnapshot();
  return Response.json({ ok: true, date });
}
