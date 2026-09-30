import { expect, type Locator, type Page } from "@playwright/test";

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

/**
 * The account menu button. Locally the test accounts have known names; on a
 * deployment the real admin's name is unknown, so any account button matches.
 */
export function accountButton(page: Page, name: string) {
  return page.getByRole("button", {
    name: IS_REMOTE ? /^Compte de / : `Compte de ${name}`,
  });
}

/** Picks an option in the custom Select (the list opens in a portal). */
export async function chooseOption(trigger: Locator, option: string) {
  await trigger.click();
  await trigger
    .page()
    .getByRole("option", { name: option, exact: true })
    .click();
  await expect(trigger).toContainText(option);
}

export async function expectLoggedIn(page: Page, name: string) {
  await expect(accountButton(page, name)).toBeVisible();
}
