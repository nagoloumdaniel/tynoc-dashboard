"use server";

import { type ActionResult, failure } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import { markAllNotificationsRead } from "./service";

export async function markNotificationsReadAction(): Promise<
  ActionResult<{ readAt: string }>
> {
  const session = await requireAdmin();
  try {
    return {
      ok: true,
      data: { readAt: await markAllNotificationsRead(session) },
    };
  } catch (error) {
    return failure(error);
  }
}
