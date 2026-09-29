import "server-only";
import { normalizeEmail, findUserByEmail } from "@/features/users/repository";
import { dummyHash, verifyPassword } from "@/lib/auth/password";
import { type AdminRole, isAdminRole } from "@/lib/auth/permissions";
import {
  checkLoginAllowed,
  clearLoginFailures,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
};

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "RATE_LIMITED" };

export async function authenticate(input: {
  email: string;
  password: string;
  ip: string;
}): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  if (!(await checkLoginAllowed(email, input.ip))) {
    return { ok: false, reason: "RATE_LIMITED" };
  }

  const user = await findUserByEmail(email);
  // Always hash, even for unknown accounts, so timing does not reveal them.
  const passwordMatches = await verifyPassword(
    input.password,
    user?.passwordHash ?? (await dummyHash()),
  );

  if (
    !user ||
    !user.passwordHash ||
    !passwordMatches ||
    user.status !== "ACTIVE" ||
    !isAdminRole(user.role)
  ) {
    await recordLoginFailure(email, input.ip);
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }

  await clearLoginFailures(email);
  return {
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
