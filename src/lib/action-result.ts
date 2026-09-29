import { AppError } from "@/lib/errors";

/** What a Server Action returns to the client. Never an exception. */
export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; message: string; code?: string };

export type FormActionState<Field extends string = string> =
  | {
      ok?: false;
      message?: string;
      fieldErrors?: Partial<Record<Field, string[]>>;
      values?: Record<string, string>;
    }
  | { ok: true; id: string; message: string }
  | undefined;

/** Converts a thrown error into a user-facing message, logging the rest. */
export function failure(error: unknown): {
  ok: false;
  message: string;
  code?: string;
} {
  if (error instanceof AppError) {
    return { ok: false, message: error.message, code: error.code };
  }
  console.error(
    "action failed",
    error instanceof Error ? error.name : "unknown",
  );
  return {
    ok: false,
    message: "Une erreur inattendue est survenue. Réessayez.",
    code: "INTERNAL_ERROR",
  };
}
