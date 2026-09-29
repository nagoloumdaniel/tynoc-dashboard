"use client";

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  PackagePlusIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveProductAction,
  deleteProductAction,
  restoreProductAction,
} from "../actions";
import type { ProductStatus } from "../types";
import { StockDialog } from "./stock-dialog";

type Props = {
  product: {
    id: string;
    name: string;
    sku: string;
    version: number;
    stock: number;
    status: ProductStatus;
  };
  canWrite: boolean;
  canDelete: boolean;
};

/** Page actions of a product; each one is also enforced by the server. */
export function ProductActions({ product, canWrite, canDelete }: Props) {
  const router = useRouter();
  const archived = product.status === "ARCHIVED";

  async function withToast(
    run: () => Promise<
      { ok: true; message: string } | { ok: false; message: string }
    >,
  ) {
    const result = await run();
    if (result.ok) toast.success(result.message);
    return result;
  }

  if (!canWrite) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {archived ? null : (
        <>
          <Button asChild variant="outline">
            <Link href={`/admin/products/${product.id}/edit`}>
              <PencilIcon aria-hidden />
              Modifier
            </Link>
          </Button>
          <StockDialog
            product={product}
            trigger={
              <Button variant="outline">
                <PackagePlusIcon aria-hidden />
                Ajuster le stock
              </Button>
            }
          />
        </>
      )}

      {archived ? (
        <ConfirmDialog
          tone="primary"
          trigger={
            <Button variant="outline">
              <ArchiveRestoreIcon aria-hidden />
              Restaurer
            </Button>
          }
          title={`Restaurer « ${product.name} » ?`}
          description="Le produit revient en brouillon : vérifiez-le avant de le republier."
          confirmLabel="Restaurer en brouillon"
          onConfirm={() =>
            withToast(() => restoreProductAction(product.id, product.version))
          }
        />
      ) : (
        <ConfirmDialog
          trigger={
            <Button variant="outline">
              <ArchiveIcon aria-hidden />
              Archiver
            </Button>
          }
          title={`Archiver « ${product.name} » ?`}
          description="Le produit disparaît de la boutique mais reste dans les paniers et wishlists existants. Vous pourrez le restaurer."
          confirmLabel="Archiver"
          onConfirm={() =>
            withToast(() => archiveProductAction(product.id, product.version))
          }
        />
      )}

      {canDelete ? (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" className="text-danger hover:bg-danger/10">
              <Trash2Icon aria-hidden />
              Supprimer
            </Button>
          }
          title={`Supprimer définitivement « ${product.name} » ?`}
          description="Cette action est irréversible. Elle est refusée si le produit est encore dans un panier ou une wishlist : archivez-le dans ce cas."
          confirmLabel="Supprimer définitivement"
          confirmationText={product.sku}
          onConfirm={async () => {
            const result = await withToast(() =>
              deleteProductAction(product.id),
            );
            if (result.ok) router.push("/admin/products");
            return result;
          }}
        />
      ) : null}
    </div>
  );
}
