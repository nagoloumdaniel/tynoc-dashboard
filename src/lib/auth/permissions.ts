export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "VIEWER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type Permission =
  | "read"
  | "products:write"
  | "products:delete"
  | "categories:write"
  | "users:write"
  | "carts:write"
  | "users:delete"
  | "admins:manage";

// ROADMAP.md § 8.2
const GRANTS: Record<AdminRole, readonly Permission[] | "all"> = {
  SUPER_ADMIN: "all",
  ADMIN: [
    "read",
    "products:write",
    "categories:write",
    "users:write",
    "carts:write",
  ],
  VIEWER: ["read"],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super administrateur",
  ADMIN: "Administrateur",
  VIEWER: "Lecture seule",
};

export function can(role: AdminRole, permission: Permission): boolean {
  const granted = GRANTS[role];
  return granted === "all" || granted.includes(permission);
}

export function isAdminRole(value: unknown): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}
