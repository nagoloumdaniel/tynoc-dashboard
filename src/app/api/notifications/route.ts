import { getNotificationFeed } from "@/features/notifications/service";
import { getSession } from "@/lib/auth/dal";

/** Polled by the bell every 15 s: JSON, never a redirect. */
export async function GET(request: Request) {
  const session = await getSession();
  // A temporary password grants nothing until it has been replaced.
  if (!session || session.mustChangePassword) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Session expirée." } },
      { status: 401 },
    );
  }
  const since = new URL(request.url).searchParams.get("since");
  const feed = await getNotificationFeed(session, since);
  return Response.json(feed, { headers: { "Cache-Control": "no-store" } });
}
