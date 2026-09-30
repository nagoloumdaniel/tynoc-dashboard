import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { authenticate } from "@/features/auth/service";
import { createCategory } from "@/features/categories/service";
import { ROOT_PARENT } from "@/features/categories/types";
import { adjustStock, createProduct } from "@/features/products/service";
import { createAdmin } from "@/features/users/service";
import { db, table } from "@/lib/aws/dynamodb";
import type { Session } from "@/lib/auth/session";
import {
  countUnread,
  queryNotifications,
  readNotificationsReadAt,
  writeNotificationsReadAt,
} from "./repository";

const actor: Session = {
  userId: "usr_notif_author",
  email: "auteur@example.com",
  name: "Auteur",
  role: "SUPER_ADMIN",
};
const OTHER = "usr_notif_reader";

let categoryId: string;
let since: string;

beforeAll(async () => {
  since = new Date().toISOString();
  categoryId = (
    await createCategory(actor, {
      name: "Notifications",
      slug: `notifications-${randomUUID().slice(0, 8)}`,
      description: undefined,
      parentId: ROOT_PARENT,
      sortOrder: 1,
      isActive: true,
    })
  ).id;
});

const feed = (userId: string) =>
  queryNotifications(userId, { since, limit: 100 });

describe("notifications", () => {
  it("reports a stock that runs out once, for everyone", async () => {
    const id = randomUUID().slice(0, 6).toUpperCase();
    const product = await createProduct(actor, {
      name: `Bougie ${id}`,
      slug: `bougie-${id.toLowerCase()}`,
      sku: `NTF-${id}`,
      description: undefined,
      categoryId,
      priceInCents: 900,
      salePriceInCents: undefined,
      stock: 10,
      lowStockThreshold: 3,
      status: "ACTIVE",
    });
    const adjust = (quantity: number, version: number) =>
      adjustStock(actor, product.id, version, {
        mode: "SET",
        quantity,
        reason: "CORRECTION",
      });

    let current = await adjust(2, product.version); // IN → LOW
    current = await adjust(1, current.version); // LOW → LOW: nothing
    current = await adjust(0, current.version); // LOW → OUT
    await adjust(0, current.version); // OUT → OUT: nothing

    const mine = (await feed(actor.userId)).filter((n) =>
      n.body.includes(`Bougie ${id}`),
    );
    expect(mine.map((n) => n.type)).toEqual(["STOCK_OUT", "STOCK_LOW"]);
    expect(mine[0]).toMatchObject({ severity: "important" });
  });

  it("hides an admin's own sensitive actions from them only", async () => {
    const name = `Admin ${randomUUID().slice(0, 6)}`;
    await createAdmin(actor, {
      name,
      email: `${randomUUID().slice(0, 8)}@test.tynoc.fr`,
      role: "VIEWER",
    });
    const about = (items: { body: string }[]) =>
      items.filter((n) => n.body.includes(name));

    expect(about(await feed(actor.userId))).toHaveLength(0);
    expect(about(await feed(OTHER))).toMatchObject([
      { type: "ADMIN_CREATED", severity: "important" },
    ]);
  });

  it("reports a blocked email once, masked", async () => {
    // A unique domain keeps the masked address recognisable in the feed.
    const domain = `${randomUUID().slice(0, 8)}.example.com`;
    const email = `cible@${domain}`;
    // Different IPs: only the email gets blocked, after the 5th failure;
    // the 6th and 7th are refused before counting.
    for (let i = 0; i < 7; i++) {
      await authenticate({ email, password: "wrong", ip: `10.0.${i}.1` });
    }
    const blocked = (await feed(OTHER)).filter((n) =>
      n.body.includes(`c•••@${domain}`),
    );
    expect(blocked).toMatchObject([{ type: "LOGIN_BLOCKED" }]);
    expect(blocked[0]!.body).not.toContain(email);
  });

  it("counts unread notifications from the reader's last read", async () => {
    const reader = `usr_${randomUUID()}`;
    await db().send(
      new PutCommand({
        TableName: table("Users"),
        Item: {
          id: reader,
          name: "Lecteur",
          email: `${reader}@example.com`,
          role: "ADMIN",
          status: "ACTIVE",
          createdAt: since,
          updatedAt: since,
          version: 1,
        },
      }),
    );
    expect(await readNotificationsReadAt(reader)).toBeUndefined();
    expect(await countUnread(reader, undefined)).toBeGreaterThan(0);

    const now = new Date().toISOString();
    await writeNotificationsReadAt(reader, now);
    expect(await readNotificationsReadAt(reader)).toBe(now);
    expect(await countUnread(reader, now)).toBe(0);
  });
});
