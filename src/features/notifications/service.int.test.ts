import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { db, table } from "@/lib/aws/dynamodb";
import type { Session } from "@/lib/auth/session";
import { loginBlocked } from "./events";
import { recordNotification } from "./repository";
import { getNotificationFeed, markAllNotificationsRead } from "./service";

let reader: Session;

beforeAll(async () => {
  const id = `usr_${randomUUID()}`;
  const now = new Date().toISOString();
  await db().send(
    new PutCommand({
      TableName: table("Users"),
      Item: {
        id,
        name: "Lecteur",
        email: `${id}@example.com`,
        role: "ADMIN",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    }),
  );
  reader = {
    userId: id,
    email: `${id}@example.com`,
    name: "Lecteur",
    role: "ADMIN",
  };
});

describe("getNotificationFeed", () => {
  it("masks addresses for read-only admins only", async () => {
    const marker = `${randomUUID().slice(0, 8)}.example.com`;
    const before = new Date().toISOString();
    await recordNotification({
      type: "PRODUCT_DELETED",
      severity: "info",
      title: "Produit supprimé",
      body: `« Pot » supprimé par auteur@${marker}.`,
      href: "/admin/activity",
      actorId: "usr_someone_else",
    });
    const body = async (role: Session["role"]) =>
      (await getNotificationFeed({ ...reader, role }, before)).items.find((n) =>
        n.body.includes(marker),
      )?.body;

    expect(await body("ADMIN")).toContain(`auteur@${marker}`);
    expect(await body("VIEWER")).toContain(`a•••@${marker}`);
    expect(await body("VIEWER")).not.toContain(`auteur@${marker}`);
  });

  it("returns only what arrived from `since`, and ignores a malformed one", async () => {
    const marker = `${randomUUID().slice(0, 8)}.example.com`;
    const before = new Date().toISOString();
    await recordNotification(loginBlocked(`x@${marker}`));

    const polled = await getNotificationFeed(reader, before);
    expect(polled.items.some((n) => n.body.includes(marker))).toBe(true);
    expect(polled.items.every((n) => n.createdAt >= before)).toBe(true);

    const future = new Date(Date.now() + 60_000).toISOString();
    expect((await getNotificationFeed(reader, future)).items).toEqual([]);

    // Not a date: the full latest feed rather than an error.
    const fallback = await getNotificationFeed(reader, "hier");
    expect(fallback.items.length).toBeGreaterThan(0);
  });

  it("clears the unread count once everything is marked as read", async () => {
    await recordNotification(loginBlocked("y@example.com"));
    expect((await getNotificationFeed(reader)).unread).toBeGreaterThan(0);

    const readAt = await markAllNotificationsRead(reader);
    const feed = await getNotificationFeed(reader);
    expect(feed).toMatchObject({ unread: 0, readAt });
  });
});
