import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { chooseOption, IS_REMOTE } from "./helpers";

test.skip(IS_REMOTE, "writes products and images");

// A real 1×1 PNG, so the image optimiser of the test server can serve it.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const png = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

async function createProduct(page: Page) {
  const id = randomUUID().slice(0, 6).toUpperCase();
  await page.goto("/admin/products/new");
  await page.getByLabel("Nom", { exact: true }).fill(`Lampe ${id}`);
  await page.getByLabel("SKU").fill(`IMG-${id}`);
  await chooseOption(page.getByLabel("Catégorie"), "Mobilier");
  await page.getByLabel("Prix (€)").fill("30");
  await page.getByRole("button", { name: "Créer le produit" }).click();
  await expect(page.getByRole("heading", { name: /^Images/ })).toBeVisible();
}

test("uploads images, changes the main one and deletes one", async ({
  page,
}) => {
  await createProduct(page);
  const gallery = page
    .getByRole("list")
    .filter({ hasText: "Ajouter des images" });

  await page
    .getByLabel("Ajouter des images")
    .setInputFiles([png("face.png"), png("dos.png")]);
  await expect(
    page.getByRole("img", { name: "Image 2 du produit" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Images (2/8)" }),
  ).toBeVisible();

  const secondSrc = await gallery
    .getByRole("img", { name: "Image 2 du produit" })
    .getAttribute("src");
  await page
    .getByRole("button", { name: "Définir l'image 2 comme principale" })
    .click();
  await expect(
    gallery.getByRole("img", { name: "Image 1 du produit" }),
  ).toHaveAttribute("src", secondSrc!);

  await page.getByRole("button", { name: "Supprimer l'image 2" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Supprimer l'image" })
    .click();
  await expect(page.getByText("Image supprimée.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Images (1/8)" }),
  ).toBeVisible();
});

test("refuses files that are not images", async ({ page }) => {
  await createProduct(page);
  await page.getByLabel("Ajouter des images").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("pas une image"),
  });
  await expect(page.getByText(/notes\.txt : Format non accepté/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Images (0/8)" }),
  ).toBeVisible();
});
