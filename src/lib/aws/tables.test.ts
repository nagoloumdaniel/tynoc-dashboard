import { describe, expect, it } from "vitest";
import { TABLES, tableName } from "./tables";

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
        "Stats",
        "Uniques",
        "Users",
        "Wishlists",
      ].sort(),
    );
  });
});
