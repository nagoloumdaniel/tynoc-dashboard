import { describe, expect, it } from "vitest";
import { missingIndexes, TABLES, TTL_ATTRIBUTES, tableName } from "./tables";

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

describe("missingIndexes", () => {
  it("lists the indexes an existing table lacks, with their attributes", () => {
    const missing = missingIndexes("Carts", ["byProduct"]);
    expect(missing.map((index) => index.IndexName)).toEqual(["byFeed"]);
    expect(missing[0]?.attributes.map((a) => a.AttributeName).sort()).toEqual([
      "feed",
      "updatedAt",
    ]);
  });

  it("returns nothing when every index exists", () => {
    expect(missingIndexes("Wishlists", ["byProduct", "byFeed"])).toEqual([]);
    expect(missingIndexes("Stats", [])).toEqual([]);
  });
});
