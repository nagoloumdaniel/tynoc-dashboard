import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "./cursor";
import { activityQuerySchema } from "./schemas";

describe("activity cursor", () => {
  const key = {
    pk: "PRODUCT#prd_1",
    sk: "2026-09-30T10:00:00.000Z#log_1",
    feed: "LOG" as const,
    createdAt: "2026-09-30T10:00:00.000Z",
  };

  it("round-trips a DynamoDB key", () => {
    const cursor = encodeCursor(key);
    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeCursor(cursor)).toEqual(key);
  });

  it.each(["", "pas-du-base64!", encodeCursor({ pk: "x" } as never), "e30"])(
    "rejects the invalid cursor %j",
    (value) => {
      expect(decodeCursor(value)).toBeNull();
    },
  );
});

describe("activityQuerySchema", () => {
  it("applies defaults and ignores invalid values", () => {
    expect(activityQuerySchema.parse({})).toEqual({
      period: 30,
      entity: undefined,
      action: undefined,
      actor: undefined,
    });
    expect(
      activityQuerySchema.parse({
        period: "7",
        entity: "PRODUCT",
        action: "nope",
        actor: "x",
      }),
    ).toEqual({
      period: 7,
      entity: "PRODUCT",
      action: undefined,
      actor: undefined,
    });
  });

  it("keeps a valid actor email", () => {
    expect(activityQuerySchema.parse({ actor: "Admin@Tynoc.fr" }).actor).toBe(
      "admin@tynoc.fr",
    );
  });
});
