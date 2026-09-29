import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const serverEnvSchema = z.object({
  AWS_REGION: z.string().min(1).default("eu-west-3"),
  // Set only for DynamoDB Local; empty in production.
  DYNAMODB_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  DYNAMODB_TABLE_PREFIX: z
    .string()
    .regex(/^[a-zA-Z0-9_.-]*$/, "lettres, chiffres, _ . - uniquement")
    .default("tynoc-"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Variables d'environnement invalides — ${details}`);
  }
  return result.data;
}

let cached: ServerEnv | undefined;

// Lazy so that `next build` does not require runtime-only variables.
export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
