"use server";

import { type ActionResult, failure } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import { forReader } from "./privacy";
import { activityQuerySchema } from "./schemas";
import { type ActivityItem, listActivity } from "./service";

type Page = { items: ActivityItem[]; nextCursor: string | null };

/** Next page of the log for "Voir plus"; filters are re-validated here. */
export async function loadMoreActivityAction(
  params: Record<string, string | undefined>,
  cursor: string,
): Promise<ActionResult<Page>> {
  const session = await requireAdmin();
  try {
    const parsed = activityQuerySchema.parse(params);
    const query =
      session.role === "VIEWER" ? { ...parsed, actor: undefined } : parsed;
    const page = await listActivity(query, cursor);
    return {
      ok: true,
      data: { ...page, items: forReader(page.items, session.role) },
    };
  } catch (error) {
    return failure(error);
  }
}
