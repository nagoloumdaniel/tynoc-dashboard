import { describe, expect, it } from "vitest";
import { TABLES, TTL_ATTRIBUTES, tableName } from "./tables";

describe("tableName", () => {
  it("prefixes the logical table name", () => {
    expect(tableName("Products", "tynoc-")).toBe("tynoc-Products");
  });

  it("declares every table from the data model", () => {
    expect(Object.keys(TABLES).sort()).toEqual(
      [
        "AuditLogs",
        "Carts",
        "Categories",
        "Products",
        "RateLimits",
        "Sessions",
        "Stats",
        "Uniques",
        "Users",
        "Wishlists",
      ].sort(),
    );
  });

  it("expires sessions and rate limits through DynamoDB TTL", () => {
    expect(TTL_ATTRIBUTES).toEqual({
      Sessions: "expiresAt",
      RateLimits: "expiresAt",
    });
  });
});
