import { randomUUID } from "node:crypto";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { describe, expect, it } from "vitest";
import { db, table } from "./dynamodb";

describe("db", () => {
  it("writes and reads an item on the test tables", async () => {
    const pk = `TEST#${randomUUID()}`;
    expect(table("Stats")).toBe("tynoc-test-Stats");

    await db().send(
      new PutCommand({ TableName: table("Stats"), Item: { pk, value: 42 } }),
    );
    const { Item } = await db().send(
      new GetCommand({ TableName: table("Stats"), Key: { pk } }),
    );

    expect(Item).toEqual({ pk, value: 42 });
  });
});
