import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getServerEnv } from "@/lib/env";

function authorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

/**
 * Vercel Cron sends "Authorization: Bearer <CRON_SECRET>". Returns the error
 * response to send, or null when the caller is the scheduler.
 */
export function cronGuard(request: Request): Response | null {
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
  return null;
}
