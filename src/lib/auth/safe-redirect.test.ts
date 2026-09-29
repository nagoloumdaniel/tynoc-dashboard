import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it.each([
    [undefined, "/admin"],
    [null, "/admin"],
    ["", "/admin"],
    ["/admin", "/admin"],
    ["/admin/products", "/admin/products"],
    ["/admin/products?q=chaise&page=2", "/admin/products?q=chaise&page=2"],
    ["https://evil.com/admin", "/admin"],
    ["//evil.com/admin", "/admin"],
    ["/\\evil.com", "/admin"],
    ["/adminevil", "/admin"],
    ["/login", "/admin"],
    ["/admin/../login", "/admin"],
    ["javascript:alert(1)", "/admin"],
  ])("safeNextPath(%j) → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
