import { expect, test } from "@playwright/test";
import { accountButton, expectLoggedIn, IS_REMOTE, logIn } from "./helpers";
import { AUTH_STATE, TEST_USERS } from "./test-users";

const INVALID = "Email ou mot de passe incorrect.";

test.describe("anonymous visitor", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("is sent to the login page with the requested path", async ({
    page,
  }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Fproducts$/);
    await expect(
      page.getByRole("heading", { name: "Connexion à l'administration" }),
    ).toBeVisible();
  });

  test("sees field errors when submitting an empty form", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(
      page.getByText("Saisissez une adresse email valide."),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  test("is refused with a wrong password", async ({ page }) => {
    await logIn(page, { ...TEST_USERS.superAdmin, password: "wrong-password" });
    await expect(page.locator("form").getByRole("alert")).toHaveText(INVALID);
    await expect(page).toHaveURL(/\/login/);
  });

  test("is refused with a customer account", async ({ page }) => {
    test.skip(IS_REMOTE, "local test account");
    await logIn(page, TEST_USERS.customer);
    await expect(page.locator("form").getByRole("alert")).toHaveText(INVALID);
  });

  test("returns to the requested page after logging in", async ({ page }) => {
    await page.goto("/admin/products");
    await page.getByLabel("Email").fill(TEST_USERS.superAdmin.email);
    await page.getByLabel("Mot de passe").fill(TEST_USERS.superAdmin.password);
    await page.getByRole("button", { name: "Se connecter" }).click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expectLoggedIn(page, TEST_USERS.superAdmin.name);
  });

  test("logs out and loses access", async ({ page }) => {
    // Own session: logging out must not end the one shared by other tests.
    await logIn(page, TEST_USERS.superAdmin);
    await expect(page).toHaveURL(/\/admin$/);

    await accountButton(page, TEST_USERS.superAdmin.name).click();
    await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin$/);
  });
});

test.describe("read-only admin", () => {
  test.skip(IS_REMOTE, "local test account");
  test.use({ storageState: AUTH_STATE.viewer });

  test("reads the dashboard but cannot open settings", async ({ page }) => {
    await page.goto("/admin");
    await expectLoggedIn(page, TEST_USERS.viewer.name);

    await page.goto("/admin/settings");
    await expect(
      page.getByRole("heading", { name: "Accès refusé" }),
    ).toBeVisible();
  });
});

test.describe("signed-in admin", () => {
  test("is redirected away from the login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/admin$/);
  });
});
