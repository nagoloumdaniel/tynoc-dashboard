import type { AdminRole } from "@/lib/auth/permissions";

export type UserRole = "CUSTOMER" | AdminRole;
export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  version: number;
};
