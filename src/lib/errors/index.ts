export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const invalid = (message: string) =>
  new AppError("VALIDATION_ERROR", 400, message);
export const unauthenticated = () =>
  new AppError("UNAUTHENTICATED", 401, "Veuillez vous connecter.");
export const forbidden = () =>
  new AppError("FORBIDDEN", 403, "Action non autorisée.");
export const notFound = (code: string, message: string) =>
  new AppError(code, 404, message);
export const conflict = (code: string, message: string) =>
  new AppError(code, 409, message);

export type PublicError = { code: string; message: string };

// Never leak stack traces, table names or AWS payloads to the client.
export function toPublicError(error: unknown): {
  status: number;
  body: PublicError;
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { code: error.code, message: error.message },
    };
  }
  return {
    status: 500,
    body: {
      code: "INTERNAL_ERROR",
      message: "Une erreur inattendue est survenue.",
    },
  };
}
