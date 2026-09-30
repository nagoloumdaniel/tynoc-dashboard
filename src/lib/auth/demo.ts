import "server-only";
import { getServerEnv } from "@/lib/env";

/**
 * The public demo account (credentials in the README). Everyone shares it,
 * so nobody may change its password and lock the others out.
 */
export function isDemoAccount(email: string): boolean {
  const demo = getServerEnv().DEMO_ACCOUNT_EMAIL;
  return demo !== undefined && email.trim().toLowerCase() === demo;
}
