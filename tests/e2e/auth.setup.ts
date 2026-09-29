import { expect, test as setup } from "@playwright/test";
import { expectLoggedIn, IS_REMOTE, logIn } from "./helpers";
import { AUTH_STATE, TEST_USERS } from "./test-users";

// Logs in once per role and saves the cookies reused by the other tests.
setup("log in as super admin", async ({ page }) => {
  await logIn(page, TEST_USERS.superAdmin);
  await expect(page).toHaveURL(/\/admin$/);
  await expectLoggedIn(page, TEST_USERS.superAdmin.name);
  await page.context().storageState({ path: AUTH_STATE.superAdmin });
});

setup("log in as viewer", async ({ page }) => {
  setup.skip(IS_REMOTE, "test accounts exist only in the local test tables");
  await logIn(page, TEST_USERS.viewer);
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: AUTH_STATE.viewer });
});

setup("log in as admin", async ({ page }) => {
  setup.skip(IS_REMOTE, "test accounts exist only in the local test tables");
  await logIn(page, TEST_USERS.admin);
  await expect(page).toHaveURL(/\/admin$/);
  await page.context().storageState({ path: AUTH_STATE.admin });
});
