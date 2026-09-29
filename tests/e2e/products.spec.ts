import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { IS_REMOTE } from "./helpers";
import { AUTH_STATE } from "./test-users";

// These journeys write data: local test tables only.
test.skip(IS_REMOTE, "writes products");

function uniqueProduct() {
  const id = randomUUID().slice(0, 6).toUpperCase();
  return { name: `Chaise test ${id}`, sku: `E2E-${id}` };
}

async function createViaForm(
  page: Page,
  product: { name: string; sku: string },
) {
  await page.goto("/admin/products/new");
  await page.getByLabel("Nom", { exact: true }).fill(product.name);
  await page.getByLabel("SKU").fill(product.sku);
  await page.getByLabel("Catégorie").selectOption({ label: "Mobilier" });
  await page.getByLabel("Prix (€)").fill("49,90");
  await page.getByLabel("Stock initial").fill("8");
  await page.getByLabel("Statut").selectOption("ACTIVE");
  await page.getByRole("button", { name: "Créer le produit" }).click();
}

test("creates, finds, edits, restocks, archives and deletes a product", async ({
  page,
}) => {
  const product = uniqueProduct();

  // Create: the slug follows the name.
  await page.goto("/admin/products/new");
  await page.getByLabel("Nom", { exact: true }).fill(product.name);
  await expect(page.getByLabel("Slug")).toHaveValue(
    product.name.toLowerCase().replaceAll(" ", "-"),
  );
  await createViaForm(page, product);
  await expect(page).toHaveURL(/\/admin\/products\/prd_/);
  await expect(page.getByText("Produit créé.")).toBeVisible();
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();

  // Find it from the list.
  await page.goto(`/admin/products?q=${product.sku}`);
  await expect(
    page.getByRole("link", { name: product.name, exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: product.name, exact: true }).click();

  // Edit the price.
  await page.getByRole("link", { name: "Modifier" }).click();
  await page.getByLabel("Prix (€)").fill("39,90");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(page.getByText("Modifications enregistrées.")).toBeVisible();
  await expect(page.getByText("39,90")).toBeVisible();

  // Remove 3 units: 5 left, which is the low-stock threshold.
  await page.getByRole("button", { name: "Ajuster le stock" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Variation").fill("-3");
  await dialog.getByLabel("Raison").selectOption({ label: "Casse ou perte" });
  await expect(dialog.getByText("Stock après ajustement : 5")).toBeVisible();
  await dialog.getByRole("button", { name: "Mettre à jour le stock" }).click();
  await expect(page.getByText("Stock mis à jour.")).toBeVisible();
  await expect(page.getByText("Stock faible").first()).toBeVisible();
  await expect(page.getByText(/Stock 8 → 5 \(Casse ou perte\)/)).toBeVisible();

  // Archive, then find it in the archived tab.
  await page.getByRole("button", { name: "Archiver" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Archiver" })
    .click();
  await expect(page.getByText("Produit archivé.")).toBeVisible();
  await page.goto(`/admin/products?status=ARCHIVED&q=${product.sku}`);
  await expect(
    page.getByRole("link", { name: product.name, exact: true }),
  ).toBeVisible();

  // Delete for good: typing the SKU unlocks the button.
  await page.getByRole("link", { name: product.name, exact: true }).click();
  await page.getByRole("button", { name: "Supprimer" }).click();
  const confirm = page.getByRole("alertdialog");
  const deleteButton = confirm.getByRole("button", {
    name: "Supprimer définitivement",
  });
  await expect(deleteButton).toBeDisabled();
  await confirm.getByLabel(/Tapez/).fill(product.sku);
  await deleteButton.click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(
    page.getByText("Produit supprimé définitivement."),
  ).toBeVisible();
});

test("explains invalid fields and a duplicate SKU", async ({ page }) => {
  await page.goto("/admin/products/new");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(
    page.getByText("Le nom doit contenir entre 2 et 120 caractères."),
  ).toBeVisible();
  await expect(page.getByText("Choisissez une catégorie.")).toBeVisible();
  await expect(page.getByLabel("Prix (€)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  const product = uniqueProduct();
  await createViaForm(page, product);
  await expect(page).toHaveURL(/\/admin\/products\/prd_/);

  await createViaForm(page, { name: `${product.name} bis`, sku: product.sku });
  await expect(page.getByText("Ce SKU est déjà utilisé.")).toBeVisible();
  await expect(page.getByLabel("SKU")).toHaveAttribute("aria-invalid", "true");
});

test.describe("read-only admin", () => {
  test.use({ storageState: AUTH_STATE.viewer });

  test("sees products but no write actions", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("heading", { name: "Produits" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Ajouter un produit" }),
    ).toHaveCount(0);

    await page.goto("/admin/products/new");
    await expect(
      page.getByRole("heading", { name: "Accès refusé" }),
    ).toBeVisible();
  });
});
