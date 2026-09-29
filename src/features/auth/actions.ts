"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { markLogin } from "@/features/users/repository";
import { passwordChangeSchema } from "@/features/users/schemas";
import { changeOwnPassword } from "@/features/users/service";
import { failure } from "@/lib/action-result";
import { writeAuditLog } from "@/lib/audit/audit-log";
import { getSession } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/safe-redirect";
import { endSession, startSession } from "@/lib/auth/session";
import { loginSchema } from "./schemas";
import { authenticate } from "./service";

export type LoginState =
  | {
      message?: string;
      fieldErrors?: { email?: string[]; password?: string[] };
      email?: string;
    }
  | undefined;

const MESSAGES = {
  INVALID_CREDENTIALS: "Email ou mot de passe incorrect.",
  RATE_LIMITED: "Trop de tentatives. Réessayez dans quelques minutes.",
  UNAVAILABLE: "Connexion impossible pour le moment. Réessayez.",
} as const;

async function clientIp(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "127.0.0.1";
}

function logError(context: string, error: unknown) {
  // Error name only: messages may contain request data.
  console.error(context, error instanceof Error ? error.name : "unknown");
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawEmail = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      email: rawEmail,
    };
  }

  try {
    const result = await authenticate({
      ...parsed.data,
      ip: await clientIp(),
    });
    if (!result.ok)
      return { message: MESSAGES[result.reason], email: rawEmail };

    await startSession(result.user);
    const { user } = result;
    after(() =>
      Promise.all([
        markLogin(user.id, new Date().toISOString()),
        writeAuditLog({
          actorId: user.id,
          actorEmail: user.email,
          action: "LOGIN",
          entityType: "USER",
          entityId: user.id,
          summary: "Connexion à l'administration",
        }),
      ]).catch((error: unknown) => logError("login bookkeeping failed", error)),
    );
  } catch (error) {
    logError("login failed", error);
    return { message: MESSAGES.UNAVAILABLE, email: rawEmail };
  }

  // Outside try: redirect() works by throwing.
  redirect(safeNextPath(formData.get("next")));
}

export async function logout(): Promise<void> {
  const session = await getSession();
  await endSession();
  if (session) {
    after(() =>
      writeAuditLog({
        actorId: session.userId,
        actorEmail: session.email,
        action: "LOGOUT",
        entityType: "USER",
        entityId: session.userId,
        summary: "Déconnexion",
      }).catch((error: unknown) => logError("logout audit failed", error)),
    );
  }
  redirect("/login");
}

export type PasswordChangeState =
  | {
      message?: string;
      fieldErrors?: { current?: string[]; next?: string[]; confirm?: string[] };
    }
  | undefined;

export async function changePasswordAction(
  _previous: PasswordChangeState,
  formData: FormData,
): Promise<PasswordChangeState> {
  const session = await getSession();
  if (!session) redirect("/login");

  const parsed = passwordChangeSchema.safeParse({
    current: String(formData.get("current") ?? ""),
    next: String(formData.get("next") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  try {
    const user = await changeOwnPassword(session, parsed.data);
    // Every session was closed: open a fresh one for this browser.
    await startSession(user);
  } catch (error) {
    const result = failure(error);
    return result.code === "WRONG_PASSWORD"
      ? { fieldErrors: { current: [result.message] } }
      : { message: result.message };
  }
  redirect("/admin?flash=password");
}
