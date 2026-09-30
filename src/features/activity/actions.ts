"use server";

import { type ActionResult, failure } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import { activityQuerySchema } from "./schemas";
import { type ActivityItem, listActivity } from "./service";

type Page = { items: ActivityItem[]; nextCursor: string | null };

/** Next page of the log for "Voir plus"; filters are re-validated here. */
export async function loadMoreActivityAction(
  params: Record<string, string | undefined>,
  cursor: string,
): Promise<ActionResult<Page>> {
  await requireAdmin();
  try {
    const query = activityQuerySchema.parse(params);
    return { ok: true, data: await listActivity(query, cursor) };
  } catch (error) {
    return failure(error);
  }
}
