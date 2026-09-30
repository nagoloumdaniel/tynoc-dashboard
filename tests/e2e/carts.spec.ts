import { expect, type Page, test } from "@playwright/test";
import { IS_REMOTE } from "./helpers";
import { AUTH_STATE, TEST_CART_PRODUCTS, TEST_USERS } from "./test-users";

// Empties fixtures created by `pnpm db:test:reset` (once per run).
test.skip(IS_REMOTE, "changes carts");

const [BOWL, CUP] = TEST_CART_PRODUCTS;

async function openFromList(
  page: Page,
  list: "carts" | "wishlists",
  email: string,
  name: string,
) {
  await page.goto(`/admin/${list}?q=${encodeURIComponent(email)}`);
  await page.getByRole("link", { name, exact: true }).click();
}

test.describe("admin", () => {
  test.use({ storageState: AUTH_STATE.admin });

  test("reads a cart, removes one line, then empties it", async ({ page }) => {
    const owner = TEST_USERS.cartOwner;
    await page.goto(`/admin/carts?q=${encodeURIComponent(owner.email)}`);
    // 1 × 15,00 + 2 × 9,00 at current prices.
    await expect(page.locator("table").getByText("33,00")).toBeVisible();

    await openFromList(page, "carts", owner.email, owner.name);
    await expect(
      page.getByRole("heading", { name: `Panier de ${owner.name}` }),
    ).toBeVisible();
    // Two cups requested, one in stock.
    await expect(
      page.locator("table").getByText("Stock insuffisant"),
    ).toBeVisible();

    await page.getByRole("button", { name: `Retirer ${CUP.name}` }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Retirer" })
      .click();
    await expect(page.getByText("Article retiré.")).toBeVisible();
    await expect(page.getByRole("link", { name: CUP.name })).toHaveCount(0);

    await page.getByRole("button", { name: "Vider le panier" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Vider le panier" })
      .click();
    await expect(page.getByText("Panier vidé (1 article(s)).")).toBeVisible();
    await expect(page.getByText("Ce panier est vide.")).toBeVisible();
  });

  test("empties a wishlist", async ({ page }) => {
    const owner = TEST_USERS.cartOwner;
    await openFromList(page, "wishlists", owner.email, owner.name);
    await expect(page.getByRole("link", { name: BOWL.name })).toBeVisible();
    await expect(page.getByRole("link", { name: CUP.name })).toBeVisible();

    await page.getByRole("button", { name: "Vider la wishlist" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Vider la wishlist" })
      .click();
    await expect(
      page.getByText("Wishlist vidée (2 article(s))."),
    ).toBeVisible();
    await expect(page.getByText("Cette wishlist est vide.")).toBeVisible();
  });

  test("lists the carts that contain a product", async ({ page }) => {
    await page.goto(`/admin/products?q=${BOWL.sku}`);
    await page.getByRole("link", { name: BOWL.name, exact: true }).click();
    await page.getByRole("link", { name: /· voir/ }).click();
    await expect(page.getByText("Paniers contenant")).toBeVisible();
    await expect(
      page.getByRole("link", { name: TEST_USERS.customer.name, exact: true }),
    ).toBeVisible();
  });
});

test.describe("read-only admin", () => {
  test.use({ storageState: AUTH_STATE.viewer });

  test("reads a cart without any action", async ({ page }) => {
    const customer = TEST_USERS.customer;
    await openFromList(page, "carts", customer.email, customer.name);
    await expect(page.getByRole("link", { name: BOWL.name })).toBeVisible();
    await expect(page.getByRole("button", { name: /Retirer/ })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Vider le panier" }),
    ).toHaveCount(0);
  });
});
