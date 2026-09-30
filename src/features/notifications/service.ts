import "server-only";
import { z } from "zod";
import type { Session } from "@/lib/auth/session";
import { maskEmailsIn } from "@/lib/format";
import {
  countUnread,
  type NotificationItem,
  queryNotifications,
  readNotificationsReadAt,
  writeNotificationsReadAt,
} from "./repository";

export type NotificationFeed = {
  items: NotificationItem[];
  unread: number;
  readAt: string | null;
};

const sinceSchema = z.iso.datetime().optional().catch(undefined);

/**
 * What the bell shows: the latest notifications (or only those from `since`
 * when polling), the unread count and the reader's last read time.
 */
export async function getNotificationFeed(
  session: Session,
  since?: string | null,
): Promise<NotificationFeed> {
  const from = sinceSchema.parse(since ?? undefined);
  const [items, readAt] = await Promise.all([
    queryNotifications(session.userId, { since: from }),
    readNotificationsReadAt(session.userId),
  ]);
  return {
    // Read-only admins (the public demo included) never see an address.
    items:
      session.role === "VIEWER"
        ? items.map((n) => ({ ...n, body: maskEmailsIn(n.body) }))
        : items,
    unread: await countUnread(session.userId, readAt),
    readAt: readAt ?? null,
  };
}

export async function markAllNotificationsRead(
  session: Session,
  now = new Date(),
): Promise<string> {
  const readAt = now.toISOString();
  await writeNotificationsReadAt(session.userId, readAt);
  return readAt;
}
