import "server-only";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { can, type Permission } from "./permissions";
import { readSession, type Session } from "./session";

/** Current session, read once per request however many components ask. */
export const getSession = cache(readSession);

/**
 * The only authorization gate. Every admin page, Server Action and Route
 * Handler calls it; proxy.ts is a convenience redirect, not a security check.
 */
export async function requireAdmin(
  permission: Permission = "read",
): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  // A temporary password grants nothing until it has been replaced.
  if (session.mustChangePassword) redirect(PASSWORD_CHANGE_PATH);
  if (!can(session.role, permission)) forbidden();
  return session;
}

export const PASSWORD_CHANGE_PATH = "/compte/mot-de-passe";
