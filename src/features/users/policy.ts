import type { AdminRole } from "@/lib/auth/permissions";
import type { UserRole } from "./types";

export type UserAction =
  | "edit"
  | "suspend"
  | "reactivate"
  | "changeRole"
  | "resetPassword"
  | "anonymize";

export type PolicyResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "FORBIDDEN_SELF"; message: string };

const NOT_ON_SELF = new Set<UserAction>(["suspend", "changeRole", "anonymize"]);
const SUPER_ADMIN_ONLY = new Set<UserAction>([
  "changeRole",
  "resetPassword",
  "anonymize",
]);

const forbidden = (message: string): PolicyResult => ({
  ok: false,
  code: "FORBIDDEN",
  message,
});

/**
 * Who may do what on which account (spec § 3). The "last active super admin"
 * rule needs the database and is checked by the service.
 */
export function canManageUser(
  actor: { userId: string; role: AdminRole },
  target: { id: string; role: UserRole },
  action: UserAction,
): PolicyResult {
  if (actor.userId === target.id && NOT_ON_SELF.has(action)) {
    return {
      ok: false,
      code: "FORBIDDEN_SELF",
      message: "Vous ne pouvez pas faire cette action sur votre propre compte.",
    };
  }
  if (action === "resetPassword" && target.role === "CUSTOMER") {
    return forbidden(
      "Les clients gèrent leur mot de passe depuis la boutique.",
    );
  }
  if (actor.role === "SUPER_ADMIN") return { ok: true };
  if (SUPER_ADMIN_ONLY.has(action)) {
    return forbidden("Action réservée aux super administrateurs.");
  }
  if (actor.role === "ADMIN" && target.role === "CUSTOMER") return { ok: true };
  return forbidden(
    actor.role === "ADMIN"
      ? "Seul un super administrateur peut gérer les comptes administrateurs."
      : "Votre rôle ne permet pas de modifier les comptes.",
  );
}
