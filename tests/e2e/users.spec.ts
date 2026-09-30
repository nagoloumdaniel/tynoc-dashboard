import { randomUUID } from "node:crypto";
import { expect, type Page, test } from "@playwright/test";
import { IS_REMOTE, logIn } from "./helpers";
import { AUTH_STATE, TEST_USERS } from "./test-users";

test.skip(IS_REMOTE, "writes accounts");

async function openProfile(page: Page, name: string, email: string) {
  await page.goto(`/admin/users?q=${encodeURIComponent(email)}`);
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}

test("a new admin must replace the temporary password before anything else", async ({
  page,
  browser,
}) => {
  const email = `nouvel.admin.${randomUUID().slice(0, 6)}@test.tynoc.fr`;

  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Ajouter un administrateur" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("Nouvel Admin");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Rôle").selectOption("ADMIN");
  await dialog.getByRole("button", { name: "Créer le compte" }).click();
  const temporary = (
    await dialog.getByLabel("Mot de passe temporaire").textContent()
  )?.trim();
  expect(temporary).toMatch(/^[A-Za-z2-9]{16}$/);
  await dialog
    .getByRole("button", { name: "J'ai transmis le mot de passe" })
    .click();

  // The new admin, in a separate browser.
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const newAdmin = await context.newPage();
  await logIn(newAdmin, { email, password: temporary! });
  await expect(newAdmin).toHaveURL(/\/compte\/mot-de-passe$/);
  await expect(
    newAdmin.getByRole("heading", { name: "Choisissez votre mot de passe" }),
  ).toBeVisible();

  // Nothing else is reachable until the password is replaced.
  await newAdmin.goto("/admin/products");
  await expect(newAdmin).toHaveURL(/\/compte\/mot-de-passe$/);

  await newAdmin.getByLabel("Mot de passe temporaire").fill(temporary!);
  await newAdmin
    .getByLabel("Nouveau mot de passe", { exact: true })
    .fill("Mon-nouveau-mot-de-passe");
  await newAdmin
    .getByLabel("Confirmez le nouveau mot de passe")
    .fill("Mon-nouveau-mot-de-passe");
  await newAdmin
    .getByRole("button", { name: "Changer le mot de passe" })
    .click();
  await expect(newAdmin).toHaveURL(/\/admin$/);
  await expect(newAdmin.getByText("Mot de passe modifié.")).toBeVisible();
  await context.close();
});

test.describe("admin", () => {
  test.use({ storageState: AUTH_STATE.admin });

  test("suspends and reactivates a customer", async ({ page }) => {
    const { name, email } = TEST_USERS.toSuspend;
    await openProfile(page, name, email);

    await page.getByRole("button", { name: "Suspendre" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Suspendre" })
      .click();
    await expect(page.getByText("Compte suspendu.")).toBeVisible();
    await expect(page.getByText("Suspendu", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Réactiver" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Réactiver" })
      .click();
    await expect(page.getByText("Compte réactivé.")).toBeVisible();
  });

  test("cannot manage administrators or change roles", async ({ page }) => {
    await openProfile(page, TEST_USERS.viewer.name, TEST_USERS.viewer.email);
    await expect(page.getByRole("button", { name: "Suspendre" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Modifier" })).toHaveCount(0);

    await openProfile(
      page,
      TEST_USERS.customer.name,
      TEST_USERS.customer.email,
    );
    await expect(page.getByRole("button", { name: "Suspendre" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Changer le rôle" }),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Anonymiser" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("button", { name: "Ajouter un administrateur" }),
    ).toHaveCount(0);
  });
});

test("a super admin anonymises an account", async ({ page }) => {
  // Its own target, so the test can run any number of times.
  const suffix = randomUUID().slice(0, 6);
  const name = `Compte Jetable ${suffix}`;
  const email = `jetable.${suffix}@test.tynoc.fr`;
  await page.goto("/admin/users");
  await page.getByRole("button", { name: "Ajouter un administrateur" }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Nom").fill(name);
  await create.getByLabel("Email").fill(email);
  await create.getByRole("button", { name: "Créer le compte" }).click();
  await create
    .getByRole("button", { name: "J'ai transmis le mot de passe" })
    .click();
  await openProfile(page, name, email);

  await page.getByRole("button", { name: "Anonymiser" }).click();
  const confirm = page.getByRole("alertdialog");
  const button = confirm.getByRole("button", {
    name: "Anonymiser définitivement",
  });
  await expect(button).toBeDisabled();
  await confirm.getByLabel(/Tapez/).fill(email);
  await button.click();

  await expect(page.getByText("Compte anonymisé.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Utilisateur supprimé" }),
  ).toBeVisible();
  await expect(page.getByText(email)).toHaveCount(0);
});

test.describe("read-only admin", () => {
  test.use({ storageState: AUTH_STATE.viewer });

  test("sees masked emails and no actions", async ({ page }) => {
    await page.goto("/admin/users?q=client test");
    await expect(page.getByText("c•••@test.tynoc.fr").first()).toBeVisible();
    await expect(page.getByText(TEST_USERS.customer.email)).toHaveCount(0);
  });
});
