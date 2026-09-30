"use client";

import { Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import { emptyLinesAction, removeLineAction } from "../actions";

type Kind = "CART" | "WISHLIST";

const LABELS = {
  CART: { container: "du panier", empty: "Vider le panier" },
  WISHLIST: { container: "de la wishlist", empty: "Vider la wishlist" },
};

async function notify(promise: Promise<{ ok: boolean; message: string }>) {
  const result = await promise;
  if (result.ok) toast.success(result.message);
  return result as { ok: true } | { ok: false; message: string };
}

export function RemoveLineButton({
  kind,
  userId,
  productId,
  productName,
  customerName,
}: {
  kind: Kind;
  userId: string;
  productId: string;
  productName: string;
  customerName: string;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Retirer ${productName}`}
          className="text-danger hover:bg-danger/10"
        >
          <XIcon aria-hidden />
          Retirer
        </Button>
      }
      title={`Retirer « ${productName} » ?`}
      description={`L'article est retiré ${LABELS[kind].container} de ${customerName}. Cette action est journalisée.`}
      confirmLabel="Retirer"
      onConfirm={() => notify(removeLineAction(kind, userId, productId))}
    />
  );
}

export function EmptyButton({
  kind,
  userId,
  customerName,
  count,
}: {
  kind: Kind;
  userId: string;
  customerName: string;
  count: number;
}) {
  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" className="text-danger">
          <Trash2Icon aria-hidden />
          {LABELS[kind].empty}
        </Button>
      }
      title={`${LABELS[kind].empty} de ${customerName} ?`}
      description={`Les ${count} article(s) sont retirés. Le client ne pourra pas les récupérer.`}
      confirmLabel={LABELS[kind].empty}
      onConfirm={() => notify(emptyLinesAction(kind, userId))}
    />
  );
}
