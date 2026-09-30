import { z } from "zod";

/** LastEvaluatedKey of the byFeed index of AuditLogs. */
const cursorSchema = z.object({
  pk: z.string().min(1).max(200),
  sk: z.string().min(1).max(200),
  feed: z.literal("LOG"),
  createdAt: z.string().min(1).max(40),
});

export type ActivityCursor = z.output<typeof cursorSchema>;

export function encodeCursor(key: ActivityCursor): string {
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

/**
 * Validated, not signed: whoever can read this page already reads the whole
 * log, so a forged cursor gives no extra access.
 */
export function decodeCursor(value: string): ActivityCursor | null {
  try {
    const parsed = cursorSchema.safeParse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
