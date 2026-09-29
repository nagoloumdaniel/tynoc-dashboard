import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ITEMS } from "./navigation";

describe("isNavItemActive", () => {
  it("matches the dashboard only on its exact path", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin/products", "/admin")).toBe(false);
  });

  it("matches a section and its nested pages", () => {
    expect(isNavItemActive("/admin/products", "/admin/products")).toBe(true);
    expect(isNavItemActive("/admin/products/p_1/edit", "/admin/products")).toBe(
      true,
    );
  });

  it("does not match a sibling that shares a prefix", () => {
    expect(isNavItemActive("/admin/users-archive", "/admin/users")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("exposes every admin section once", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual([
      "/admin",
      "/admin/products",
      "/admin/categories",
      "/admin/users",
      "/admin/carts",
      "/admin/wishlists",
      "/admin/activity",
      "/admin/settings",
    ]);
  });
});
