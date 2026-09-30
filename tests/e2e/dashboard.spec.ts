import { expect, test } from "@playwright/test";
import { chooseOption } from "./helpers";
import { AUTH_STATE, TEST_USERS } from "./test-users";

test("the dashboard shows figures, follows the period and links to lists", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Aujourd'hui" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Sur les 30 derniers jours" }),
  ).toBeVisible();

  const periods = page.getByRole("navigation", { name: "Période" });
  await periods.getByRole("link", { name: "7 jours" }).click();
  await expect(page).toHaveURL(/\/admin\?period=7$/);
  await expect(periods.getByRole("link", { name: "7 jours" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByRole("heading", { name: "Sur les 7 derniers jours" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /^En rupture/ }).click();
  await expect(page).toHaveURL(/\/admin\/products\?stock=out$/);
});

test("every chart has its data as a table", async ({ page }) => {
  await page.goto("/admin");
  const chart = page.getByRole("figure", { name: /Produits par catégorie/ });
  await expect(chart).toBeVisible();
  await chart.getByText("Voir les données").click();
  await expect(
    chart.getByRole("columnheader", { name: "Catégorie" }),
  ).toBeVisible();
});

test("the activity log filters by action", async ({ page }) => {
  await page.goto("/admin/activity");
  await expect(
    page.getByRole("heading", { level: 1, name: "Activité" }),
  ).toBeVisible();

  await chooseOption(page.getByLabel("Action", { exact: true }), "Connexion");
  await expect(page).toHaveURL(/action=LOGIN/);
  const entries = page.locator("main ol > li");
  await expect(entries.first()).toContainText("Connexion");
  // Every entry left is a login.
  for (const entry of await entries.all()) {
    await expect(entry).toContainText("Connexion ·");
  }
});

test("the theme can be switched to dark and is remembered", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByRole("button", { name: /^Compte de / }).click();
  await page.getByRole("menuitemradio", { name: "Sombre" }).click();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
});

test.describe("read-only admin", () => {
  test.use({ storageState: AUTH_STATE.viewer });

  test("sees customer emails masked on the dashboard", async ({ page }) => {
    await page.goto("/admin");
    const widget = page
      .getByRole("heading", { name: "Derniers clients" })
      .locator("xpath=ancestor::section[1]");
    await expect(widget).toBeVisible();
    await expect(widget).not.toContainText(TEST_USERS.customer.email);
    await expect(widget).toContainText("@");
  });
});
