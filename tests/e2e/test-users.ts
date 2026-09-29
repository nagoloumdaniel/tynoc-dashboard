// Accounts created in the test tables by `pnpm db:test:reset`.
// Against a deployment (E2E_BASE_URL), the super admin comes from env vars.
export const TEST_USERS = {
  superAdmin: {
    email: process.env.E2E_ADMIN_EMAIL ?? "super.admin@test.tynoc.fr",
    password: process.env.E2E_ADMIN_PASSWORD ?? "Test-Super-Admin-2026!",
    name: "Super Admin Test",
    role: "SUPER_ADMIN",
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
} as const;

export const AUTH_STATE = {
  superAdmin: "playwright/.auth/super-admin.json",
  viewer: "playwright/.auth/viewer.json",
} as const;
