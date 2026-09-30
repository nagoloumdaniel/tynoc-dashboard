import { randomUUID } from "node:crypto";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import { db, table } from "@/lib/aws/dynamodb";
import { listActors } from "./service";

async function putUser(role: string, status = "ACTIVE") {
  const id = `usr_${randomUUID()}`;
  const now = new Date().toISOString();
  const email = `${id}@exemple.fr`;
  await db().send(
    new PutCommand({
      TableName: table("Users"),
      Item: {
        id,
        name: `Compte ${role}`,
        email,
        role,
        status,
        createdAt: now,
        updatedAt: now,
        version: 1,
      },
    }),
  );
  return email;
}

describe("listActors", () => {
  it("lists admin accounts only, sorted by email", async () => {
    const admin = await putUser("ADMIN");
    const viewer = await putUser("VIEWER", "SUSPENDED");
    const customer = await putUser("CUSTOMER");

    const actors = await listActors();
    const emails = actors.map((a) => a.email);
    expect(emails).toContain(admin);
    expect(emails).toContain(viewer);
    expect(emails).not.toContain(customer);
    expect(emails).toEqual([...emails].sort());
  });
});
