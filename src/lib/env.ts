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
  // Product images. Without a bucket the gallery says storage is off.
  S3_BUCKET: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, "nom de bucket S3 invalide")
      .optional(),
  ),
  // Set only for the local RustFS container; empty in production.
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  // Optional override of the public base URL (e.g. a CDN).
  S3_PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  // Sent by Vercel Cron as "Authorization: Bearer <secret>".
  CRON_SECRET: z.preprocess(emptyToUndefined, z.string().min(16).optional()),
  // Production only: IAM role assumed through Vercel OIDC (no stored AWS keys).
  AWS_ROLE_ARN: z.preprocess(
    emptyToUndefined,
    z.string().startsWith("arn:aws:iam::").optional(),
  ),
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
