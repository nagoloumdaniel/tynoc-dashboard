"use server";

import { revalidatePath } from "next/cache";
import { failure } from "@/lib/action-result";
import { requireAdmin } from "@/lib/auth/dal";
import { emptyLines, removeLine } from "./service";

type Kind = "CART" | "WISHLIST";
type Outcome = { ok: true; message: string } | { ok: false; message: string };

function refresh(kind: Kind, userId: string) {
  const base = kind === "CART" ? "/admin/carts" : "/admin/wishlists";
  revalidatePath(base);
  revalidatePath(`${base}/${userId}`);
  revalidatePath(`/admin/users/${userId}`);
}

export async function removeLineAction(
  kind: Kind,
  userId: string,
  productId: string,
): Promise<Outcome> {
  const session = await requireAdmin("carts:write");
  try {
    await removeLine(session, kind, userId, productId);
    refresh(kind, userId);
    return { ok: true, message: "Article retiré." };
  } catch (error) {
    return failure(error);
  }
}

export async function emptyLinesAction(
  kind: Kind,
  userId: string,
): Promise<Outcome> {
  const session = await requireAdmin("carts:write");
  try {
    const count = await emptyLines(session, kind, userId);
    refresh(kind, userId);
    return {
      ok: true,
      message: `${kind === "CART" ? "Panier vidé" : "Wishlist vidée"} (${count} article(s)).`,
    };
  } catch (error) {
    return failure(error);
  }
}
