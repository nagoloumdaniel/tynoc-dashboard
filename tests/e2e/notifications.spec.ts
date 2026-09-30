import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { chooseOption, IS_REMOTE } from "./helpers";
import { AUTH_STATE } from "./test-users";

test.skip(IS_REMOTE, "writes products and notifications");

test("another admin is notified when a product runs out", async ({
  page,
  browser,
}) => {
  // Polling every 15 s, plus a product created and emptied.
  test.slow();

  // The admin keeps the dashboard open…
  const adminContext = await browser.newContext({
    storageState: AUTH_STATE.admin,
  });
  const admin = await adminContext.newPage();
  await admin.goto("/admin");
  const bell = admin.getByRole("button", { name: /^Notifications/ });
  await expect(bell).toBeVisible();

  // …while the super admin empties a product's stock.
  const id = randomUUID().slice(0, 6).toUpperCase();
  const name = `Vase ${id}`;
  await page.goto("/admin/products/new");
  await page.getByLabel("Nom", { exact: true }).fill(name);
  await page.getByLabel("SKU").fill(`NTF-${id}`);
  await chooseOption(page.getByLabel("Catégorie"), "Mobilier");
  await page.getByLabel("Prix (€)").fill("20");
  await page.getByLabel("Stock initial").fill("4");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await page.getByRole("button", { name: "Ajuster le stock" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Variation").fill("-4");
  await chooseOption(dialog.getByLabel("Raison"), "Casse ou perte");
  await dialog.getByRole("button", { name: "Mettre à jour le stock" }).click();
  await expect(page.getByText("Stock mis à jour.")).toBeVisible();

  // The next poll brings it: a toast (important), the badge, the list.
  await expect(
    admin.getByText(`« ${name} » n'a plus de stock.`).first(),
  ).toBeVisible({ timeout: 25_000 });
  await expect(bell).toHaveAccessibleName(/non lue/);

  await bell.click();
  const panel = admin.getByRole("dialog");
  await expect(
    panel.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Tout marquer comme lu" }).click();
  await expect(bell).toHaveAccessibleName("Notifications");

  await adminContext.close();
});
