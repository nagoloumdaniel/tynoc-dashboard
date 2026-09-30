import { timingSafeEqual } from "node:crypto";
import { writeSnapshot } from "@/features/dashboard/service";
import { getServerEnv } from "@/lib/env";

function authorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

/** Daily copy of the dashboard counters (Vercel Cron, see vercel.json). */
export async function GET(request: Request) {
  const secret = getServerEnv().CRON_SECRET;
  if (!secret) {
    return Response.json(
      {
        error: {
          code: "CRON_DISABLED",
          message: "CRON_SECRET n'est pas défini.",
        },
      },
      { status: 503 },
    );
  }
  if (!authorized(request.headers.get("authorization"), secret)) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Accès refusé." } },
      { status: 401 },
    );
  }
  const date = await writeSnapshot();
  return Response.json({ ok: true, date });
}
