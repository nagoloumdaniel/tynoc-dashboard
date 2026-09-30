import { ArrowLeftIcon, HeartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { type Column, DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  EmptyButton,
  RemoveLineButton,
} from "@/features/carts/components/line-actions";
import {
  AvailabilityBadge,
  formatDateTime,
} from "@/features/carts/components/shared";
import { getWishlist } from "@/features/carts/service";
import { unitPrice } from "@/features/carts/summary";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Wishlist" };

type Item = Awaited<ReturnType<typeof getWishlist>>["items"][number];

export default async function WishlistPage({
  params,
}: PageProps<"/admin/wishlists/[userId]">) {
  const session = await requireAdmin();
  const { userId } = await params;
  const wishlist = await getWishlist(userId);
  const canWrite = can(session.role, "carts:write");
  const customerName = wishlist.customer?.name ?? "ce client";

  const productCell = ({ line, product }: Item) =>
    product ? (
      <div className="min-w-0">
        <Link
          href={`/admin/products/${product.id}`}
          className="block truncate font-medium hover:underline"
        >
          {product.name}
        </Link>
        <span className="font-mono text-xs text-muted-foreground">
          {product.sku}
        </span>
      </div>
    ) : (
      <span className="text-muted-foreground">{line.productId}</span>
    );

  const remove = (i: Item) => (
    <RemoveLineButton
      kind="WISHLIST"
      userId={userId}
      productId={i.line.productId}
      productName={i.product?.name ?? i.line.productId}
      customerName={customerName}
    />
  );

  const columns: Column<Item>[] = [
    {
      key: "product",
      header: "Produit",
      cell: productCell,
      className: "max-w-72",
    },
    {
      key: "price",
      header: "Prix",
      cell: ({ product }) => (product ? formatPrice(unitPrice(product)) : "—"),
      className: "text-right tabular-nums",
    },
    {
      key: "availability",
      header: "Disponibilité",
      cell: (i) => <AvailabilityBadge value={i.availability} />,
    },
    {
      key: "addedAt",
      header: "Ajouté le",
      cell: (i) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(i.line.addedAt)}
        </span>
      ),
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            cell: remove,
          },
        ]
      : []),
  ];

  return (
    <>
      <Link
        href="/admin/wishlists"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Wishlists
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Wishlist de {customerName}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/admin/users/${userId}`} className="hover:underline">
              Voir le compte
            </Link>
          </p>
        </div>
        {canWrite && wishlist.items.length > 0 ? (
          <EmptyButton
            kind="WISHLIST"
            userId={userId}
            customerName={customerName}
            count={wishlist.items.length}
          />
        ) : null}
      </div>

      {wishlist.items.length === 0 ? (
        <EmptyState icon={HeartIcon} title="Cette wishlist est vide." />
      ) : (
        <DataTable
          caption={`Wishlist de ${customerName}`}
          rows={wishlist.items}
          columns={columns}
          rowKey={(i) => i.line.productId}
          renderCard={(i) => (
            <article className="rounded-lg border bg-surface p-4">
              {productCell(i)}
              <div className="mt-3 flex items-center justify-between">
                <AvailabilityBadge value={i.availability} />
                {canWrite ? remove(i) : null}
              </div>
            </article>
          )}
        />
      )}
    </>
  );
}
