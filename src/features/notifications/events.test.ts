import { describe, expect, it } from "vitest";
import {
  adminCreated,
  loginBlocked,
  productDeleted,
  roleChanged,
  stockNotification,
  userAnonymized,
} from "./events";

const actor = { userId: "usr_a", email: "alice@tynoc.fr" };
const product = (stock: number, status: string = "ACTIVE") => ({
  id: "prd_1",
  name: "Lampe",
  stock,
  lowStockThreshold: 5,
  status,
});

describe("stockNotification", () => {
  it("warns when stock falls to the low threshold", () => {
    expect(stockNotification(product(8), product(5))).toMatchObject({
      type: "STOCK_LOW",
      severity: "info",
      title: "Stock faible",
      href: "/admin/products/prd_1",
    });
  });

  it("alerts as important when the product runs out", () => {
    for (const before of [product(8), product(3)]) {
      expect(stockNotification(before, product(0))).toMatchObject({
        type: "STOCK_OUT",
        severity: "important",
      });
    }
  });

  it("stays quiet when stock does not get worse or the product is archived", () => {
    expect(stockNotification(product(3), product(2))).toBeNull();
    expect(stockNotification(product(0), product(4))).toBeNull();
    expect(stockNotification(product(8), product(9))).toBeNull();
    expect(stockNotification(product(8), product(0, "ARCHIVED"))).toBeNull();
    // A threshold raised above the stock also counts as low stock.
    expect(
      stockNotification(product(8), { ...product(8), lowStockThreshold: 10 }),
    ).toMatchObject({ type: "STOCK_LOW" });
  });
});

describe("sensitive actions", () => {
  it("names the author and keeps their id to hide it from them", () => {
    const deleted = productDeleted(actor, { name: "Lampe", sku: "LMP-1" });
    expect(deleted).toMatchObject({
      type: "PRODUCT_DELETED",
      actorId: "usr_a",
      href: "/admin/activity?entity=PRODUCT&action=DELETE",
    });
    expect(deleted.body).toContain("alice@tynoc.fr");

    expect(userAnonymized(actor, { id: "usr_b" })).toMatchObject({
      type: "USER_ANONYMIZED",
      actorId: "usr_a",
      href: "/admin/users/usr_b",
    });
  });

  it("describes role changes and new admins, as important", () => {
    const changed = roleChanged(
      actor,
      { id: "usr_b", name: "Bob" },
      "VIEWER",
      "ADMIN",
    );
    expect(changed).toMatchObject({
      type: "ROLE_CHANGED",
      severity: "important",
    });
    expect(changed.body).toContain("Lecture seule → Administrateur");

    const created = adminCreated(actor, {
      id: "usr_c",
      name: "Chloé",
      role: "SUPER_ADMIN",
    });
    expect(created).toMatchObject({
      type: "ADMIN_CREATED",
      severity: "important",
      href: "/admin/users/usr_c",
    });
    expect(created.body).toContain("Super administrateur");
  });
});

describe("loginBlocked", () => {
  it("masks the targeted email", () => {
    const blocked = loginBlocked("victime@example.com");
    expect(blocked).toMatchObject({
      type: "LOGIN_BLOCKED",
      severity: "important",
    });
    expect(blocked.body).not.toContain("victime@example.com");
    expect(blocked.actorId).toBeUndefined();
  });
});
