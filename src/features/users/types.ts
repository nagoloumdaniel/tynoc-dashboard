import { type AdminRole, ROLE_LABELS } from "@/lib/auth/permissions";

export type UserRole = "CUSTOMER" | AdminRole;
export const USER_ROLES = [
  "CUSTOMER",
  "VIEWER",
  "ADMIN",
  "SUPER_ADMIN",
] as const;

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
  /** Set on accounts created with a temporary password. */
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  anonymizedAt?: string;
  version: number;
};

/** Fields read for the list page (DynamoDB projection). */
export const USER_LIST_FIELDS = [
  "id",
  "name",
  "email",
  "role",
  "status",
  "createdAt",
  "lastLoginAt",
] as const;

export type UserListItem = Pick<UserRecord, (typeof USER_LIST_FIELDS)[number]>;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  CUSTOMER: "Client",
  ...ROLE_LABELS,
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  DELETED: "Supprimé",
};
