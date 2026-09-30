import type { AdminRole } from "@/lib/auth/permissions";
import { maskEmail, maskEmailsIn } from "@/lib/format";

type Entry = {
  actorEmail: string;
  summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

const maskValue = (value: unknown) =>
  typeof value === "string" ? maskEmailsIn(value) : value;

/**
 * Read-only admins (the public demo account included) never receive an
 * email address in clear: authors, summaries and changed values.
 */
export function forReader<T extends Entry>(items: T[], role: AdminRole): T[] {
  if (role !== "VIEWER") return items;
  return items.map((item) => ({
    ...item,
    actorEmail: maskEmail(item.actorEmail),
    summary: maskEmailsIn(item.summary),
    ...(item.changes && {
      changes: Object.fromEntries(
        Object.entries(item.changes).map(([field, { from, to }]) => [
          field,
          { from: maskValue(from), to: maskValue(to) },
        ]),
      ),
    }),
  }));
}
