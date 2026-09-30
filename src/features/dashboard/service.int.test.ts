import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import { listActivity } from "@/features/activity/service";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { db, table } from "@/lib/aws/dynamodb";
import { getKpis, getMovements, writeSnapshot } from "./service";

const DAY = 86_400_000;
const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY).toISOString();

async function putCustomer(createdAt: string) {
  const id = `usr_${randomUUID()}`;
  await db().send(
    new PutCommand({
      TableName: table("Users"),
      Item: {
        id,
        name: "Client daté",
        email: `${id}@exemple.fr`,
        role: "CUSTOMER",
        status: "ACTIVE",
        createdAt,
        updatedAt: createdAt,
        version: 1,
      },
    }),
  );
}

describe("dashboard service", () => {
  it("counts new customers in the period and the previous one", async () => {
    const before = await getMovements(7);
    await putCustomer(daysAgo(2)); // current week
    await putCustomer(daysAgo(10)); // previous week
    await putCustomer(daysAgo(40)); // outside both

    const after = await getMovements(7);
    expect(after.newCustomers.current).toBe(before.newCustomers.current + 1);
    expect(after.newCustomers.previous).toBe(
      (before.newCustomers.previous ?? 0) + 1,
    );
  });

  it("snapshots today's counters and compares totals with past snapshots", async () => {
    const date = await writeSnapshot();
    const { Item } = await db().send(
      new GetCommand({
        TableName: table("Stats"),
        Key: { pk: `SNAPSHOT#${date}` },
      }),
    );
    const { Item: global } = await db().send(
      new GetCommand({ TableName: table("Stats"), Key: { pk: "GLOBAL" } }),
    );
    expect(Item?.totalUsers).toBe(global?.totalUsers);

    // Writing again the same day just refreshes it.
    await expect(writeSnapshot()).resolves.toBe(date);

    // No snapshot 90 days ago in the test tables: no comparison.
    const kpis = await getKpis(90);
    expect(kpis.totalUsers.previous).toBeNull();
  });
});

describe("activity service", () => {
  it("filters by author and pages with a cursor", async () => {
    const actorEmail = `auteur.${randomUUID().slice(0, 8)}@exemple.fr`;
    for (let i = 0; i < 7; i++) {
      await writeAuditLog({
        actorId: "usr_x",
        actorEmail,
        action: i % 2 ? "UPDATE" : "CREATE",
        entityType: "PRODUCT",
        entityId: `prd_${i}`,
        summary: `Action ${i}`,
      });
    }
    const query = {
      period: 7 as const,
      actor: actorEmail,
      entity: undefined,
      action: undefined,
    };

    const first = await listActivity(query, undefined, 5);
    expect(first.items).toHaveLength(5);
    expect(first.items.every((item) => item.actorEmail === actorEmail)).toBe(
      true,
    );
    expect(first.nextCursor).not.toBeNull();

    const second = await listActivity(query, first.nextCursor!, 5);
    // Entries written in the same millisecond have no guaranteed order.
    expect(second.items).toHaveLength(2);
    const seen = [...first.items, ...second.items].map((i) => i.summary);
    expect(new Set(seen).size).toBe(7);

    const updates = await listActivity(
      { ...query, action: "UPDATE" },
      undefined,
      10,
    );
    expect(updates.items).toHaveLength(3);
  });
});
