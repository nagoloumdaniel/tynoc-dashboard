import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { chooseOption, IS_REMOTE } from "./helpers";
import { AUTH_STATE } from "./test-users";

test.skip(IS_REMOTE, "writes categories");

async function createCategory(page: Page, name: string, parent?: string) {
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "Nouvelle catégorie" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill(name);
  if (parent) {
    await chooseOption(dialog.getByLabel("Catégorie parente"), parent);
  }
  await dialog.getByRole("button", { name: "Créer la catégorie" }).click();
  await expect(page.getByText("Catégorie créée.")).toBeVisible();
}

test("a sub-category is used by products and protected while it has some", async ({
  page,
}) => {
  const id = randomUUID().slice(0, 6).toUpperCase();
  const name = `Tabourets ${id}`;
  const sku = `CAT-${id}`;

  await createCategory(page, name, "Mobilier");

  // Assign a product to the new sub-category.
  await page.goto("/admin/products/new");
  await page.getByLabel("Nom", { exact: true }).fill(`Tabouret ${id}`);
  await page.getByLabel("SKU").fill(sku);
  await chooseOption(page.getByLabel("Catégorie"), `Mobilier › ${name}`);
  await page.getByLabel("Prix (€)").fill("35");
  await page.getByLabel("Stock initial").fill("4");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(page.getByText("Produit créé.")).toBeVisible();
  await expect(page.getByText(`Mobilier › ${name}`)).toBeVisible();

  // Filtering the list by the parent includes its sub-categories.
  await page.goto(`/admin/products?category=cat_mobilier&q=${sku}`);
  await expect(
    page.getByRole("link", { name: `Tabouret ${id}`, exact: true }),
  ).toBeVisible();

  // Deleting the sub-category is refused while it holds a product.
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: `Supprimer ${name}` }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Supprimer" }).click();
  await expect(confirm.getByRole("alert")).toContainText(
    "Cette catégorie contient 1 produit(s)",
  );
  await confirm.getByRole("button", { name: "Annuler" }).click();

  // Deactivated: no longer offered for new products.
  await page.getByRole("button", { name: `Désactiver ${name}` }).click();
  await expect(page.getByText("Catégorie désactivée.")).toBeVisible();
  await page.goto("/admin/products/new");
  await expect(
    page.getByLabel("Catégorie").locator("option", { hasText: name }),
  ).toHaveCount(0);
});

test("an empty category can be deleted", async ({ page }) => {
  const name = `Temporaire ${randomUUID().slice(0, 6)}`;
  await createCategory(page, name);

  await page.getByRole("button", { name: `Supprimer ${name}` }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page.getByText("Catégorie supprimée.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Supprimer ${name}` }),
  ).toHaveCount(0);
});

test("a duplicate slug is explained under the field", async ({ page }) => {
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "Nouvelle catégorie" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("Mobilier");
  await dialog.getByRole("button", { name: "Créer la catégorie" }).click();
  await expect(
    dialog.getByText("Ce slug de catégorie est déjà utilisé."),
  ).toBeVisible();
});

test.describe("read-only admin", () => {
  test.use({ storageState: AUTH_STATE.viewer });

  test("sees categories without write actions", async ({ page }) => {
    await page.goto("/admin/categories");
    await expect(
      page.getByRole("heading", { name: "Catégories" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nouvelle catégorie" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Modifier / })).toHaveCount(
      0,
    );
  });
});
