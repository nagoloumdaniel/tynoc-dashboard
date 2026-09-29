import { expect, type Page } from "@playwright/test";

export const IS_REMOTE = !!process.env.E2E_BASE_URL;

export async function logIn(
  page: Page,
  user: { email: string; password: string },
  path = "/login",
) {
  await page.goto(path);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Mot de passe").fill(user.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

export async function expectLoggedIn(page: Page, name: string) {
  await expect(
    page.getByRole("button", { name: `Compte de ${name}` }),
  ).toBeVisible();
}
