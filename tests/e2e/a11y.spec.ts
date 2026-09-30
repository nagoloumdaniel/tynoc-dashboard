import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** One readable line per violation, so a failure says what to fix. */
async function violations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(WCAG)
    .analyze();
  return violations.flatMap((v) =>
    v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${v.help}`),
  );
}

// First detail link of a list page, so the check follows real data.
async function firstDetail(page: Page, list: string, prefix: string) {
  await page.goto(list);
  const href = await page
    .locator(`main a[href^="${prefix}"]`)
    .first()
    .getAttribute("href");
  return href!;
}

const LISTS = [
  "/admin",
  "/admin/products",
  "/admin/products/new",
  "/admin/categories",
  "/admin/users",
  "/admin/carts",
  "/admin/wishlists",
  "/admin/activity",
  "/admin/settings",
  "/compte/mot-de-passe",
];

const DETAILS = [
  ["/admin/products", "/admin/products/prd_"],
  ["/admin/users", "/admin/users/usr_"],
  ["/admin/carts", "/admin/carts/usr_"],
  ["/admin/wishlists", "/admin/wishlists/usr_"],
] as const;

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => {
        localStorage.setItem("theme", value);
      }, theme);
    });

    for (const path of LISTS) {
      test(`${path} has no WCAG AA violation`, async ({ page }) => {
        await page.goto(path);
        await page.locator("main h1").first().waitFor();
        // Let streamed widgets and charts settle.
        await page.waitForLoadState("networkidle");
        expect(await violations(page)).toEqual([]);
      });
    }

    // One test per detail page: each opens its list first, then the detail.
    for (const [list, prefix] of DETAILS) {
      test(`first detail of ${list} has no WCAG AA violation`, async ({
        page,
      }) => {
        const path = await firstDetail(page, list, prefix);
        await page.goto(path);
        await page.locator("main h1").first().waitFor();
        await page.waitForLoadState("networkidle");
        expect(await violations(page), path).toEqual([]);
      });
    }
  });
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/login has no WCAG AA violation", async ({ page }) => {
    await page.goto("/login");
    expect(await violations(page)).toEqual([]);
  });
});
