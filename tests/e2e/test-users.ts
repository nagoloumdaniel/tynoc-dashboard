// Accounts created in the test tables by `pnpm db:test:reset`.
// Against a deployment (E2E_BASE_URL), the super admin comes from env vars.
export const TEST_USERS = {
  superAdmin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "super.admin@test.tynoc.fr",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Test-Super-Admin-2026!",
    name: "Super Admin Test",
    role: "SUPER_ADMIN",
  },
  admin: {
    email: "admin@test.tynoc.fr",
    password: "Test-Admin-2026!",
    name: "Admin Test",
    role: "ADMIN",
  },
  viewer: {
    email: "lecteur@test.tynoc.fr",
    password: "Test-Lecteur-2026!",
    name: "Lecteur Test",
    role: "VIEWER",
  },
  customer: {
    email: "client@test.tynoc.fr",
    password: "Test-Client-2026!",
    name: "Client Test",
    role: "CUSTOMER",
  },
  // Dedicated targets: destructive tests never touch shared accounts.
  toSuspend: {
    email: "a.suspendre@test.tynoc.fr",
    password: "Test-Suspendre-2026!",
    name: "Client À Suspendre",
    role: "CUSTOMER",
  },
  // Owns a 2-line cart and a 2-product wishlist that the E2E tests empty.
  cartOwner: {
    email: "panier@test.tynoc.fr",
    password: "Test-Panier-2026!",
    name: "Client Panier",
    role: "CUSTOMER",
  },
} as const;

/** Products put in the test carts (created by `pnpm db:test:reset`). */
export const TEST_CART_PRODUCTS = [
  {
    sku: "TEST-CART-1",
    name: "Bol en grès test",
    priceInCents: 1500,
    stock: 10,
  },
  {
    sku: "TEST-CART-2",
    name: "Tasse émaillée test",
    priceInCents: 900,
    stock: 1,
  },
] as const;

export const AUTH_STATE = {
  superAdmin: "playwright/.auth/super-admin.json",
  admin: "playwright/.auth/admin.json",
  viewer: "playwright/.auth/viewer.json",
} as const;
