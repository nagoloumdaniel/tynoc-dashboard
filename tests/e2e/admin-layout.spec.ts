import { expect, test } from "@playwright/test";

const SECTIONS = [
  "Tableau de bord",
  "Produits",
  "Catégories",
  "Utilisateurs",
  "Paniers",
  "Wishlists",
  "Activité",
  "Paramètres",
];

test("the root redirects to the admin dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Tableau de bord" }),
  ).toBeVisible();
});

test("the page never scrolls horizontally", async ({ page }) => {
  await page.goto("/admin/products");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test.describe("desktop", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "desktop only");

  test("the sidebar lists every section and marks the active one", async ({
    page,
  }) => {
    await page.goto("/admin");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    for (const label of SECTIONS) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    await nav.getByRole("link", { name: "Produits" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(nav.getByRole("link", { name: "Produits" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("the collapsed sidebar is remembered after a reload", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.getByRole("button", { name: "Replier le menu" }).click();
    await expect(
      page.getByRole("button", { name: "Déplier le menu" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("button", { name: "Déplier le menu" }),
    ).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024, "mobile only");

  test("navigation opens in a drawer and closes after choosing a section", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(
      page.getByRole("button", { name: "Replier le menu" }),
    ).toBeHidden();

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();

    await drawer.getByRole("link", { name: "Utilisateurs" }).click();
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(drawer).toBeHidden();
    await expect(
      page.getByRole("heading", { level: 1, name: "Utilisateurs" }),
    ).toBeVisible();
  });
});
