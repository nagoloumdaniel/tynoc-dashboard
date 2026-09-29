import "server-only";
import { cookies } from "next/headers";
import { after } from "next/server";
import type { AuthUser } from "@/features/auth/service";
import { SESSION_COOKIE } from "./cookie";
import type { AdminRole } from "./permissions";
import {
  ABSOLUTE_TIMEOUT_S,
  isSessionActive,
  newSessionTimes,
  nowInSeconds,
  renewedExpiry,
} from "./session-policy";
import {
  createSession,
  deleteSession,
  findSession,
  touchSession,
} from "./session-repository";
import { generateSessionToken, hashToken } from "./tokens";

export type Session = {
  userId: string;
  role: AdminRole;
  email: string;
  name: string;
  mustChangePassword?: boolean;
};

export async function startSession(user: AuthUser): Promise<void> {
  const token = generateSessionToken();
  const now = new Date().toISOString();
  await createSession({
    pk: hashToken(token),
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    mustChangePassword: user.mustChangePassword,
    createdAt: now,
    lastSeenAt: now,
    ...newSessionTimes(nowInSeconds()),
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // Cookies cannot be refreshed while rendering, so the cookie lives for the
    // absolute limit and the 12 h idle limit is enforced in the database.
    maxAge: ABSOLUTE_TIMEOUT_S,
  });
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const record = await findSession(tokenHash);
  const now = nowInSeconds();
  if (!record || !isSessionActive(record, now)) return null;

  const expiresAt = renewedExpiry(record, now);
  if (expiresAt !== null) {
    // Sliding expiry, written after the response is sent.
    after(() =>
      touchSession(tokenHash, expiresAt, new Date().toISOString()).catch(
        (error: unknown) =>
          console.error("session renewal failed", (error as Error).name),
      ),
    );
  }

  return {
    userId: record.userId,
    role: record.role,
    email: record.email,
    name: record.name,
    mustChangePassword: record.mustChangePassword === true,
  };
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(hashToken(token));
  store.delete(SESSION_COOKIE);
}
