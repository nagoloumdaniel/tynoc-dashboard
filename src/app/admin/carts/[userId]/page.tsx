import { ArrowLeftIcon, ShoppingCartIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { type Column, DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  EmptyButton,
  RemoveLineButton,
} from "@/features/carts/components/line-actions";
import {
  AbandonedBadge,
  AvailabilityBadge,
  formatDateTime,
} from "@/features/carts/components/shared";
import { getCart } from "@/features/carts/service";
import { unitPrice } from "@/features/carts/summary";
import { ProductThumb } from "@/features/products/components/product-thumb";
import { mainImageUrl } from "@/features/products/image-urls";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Panier" };

type Item = Awaited<ReturnType<typeof getCart>>["items"][number];

export default async function CartPage({
  params,
}: PageProps<"/admin/carts/[userId]">) {
  const session = await requireAdmin();
  const { userId } = await params;
  const cart = await getCart(userId);
  const canWrite = can(session.role, "carts:write");
  const customerName = cart.customer?.name ?? "ce client";

  const productCell = ({ line, product }: Item) =>
    product ? (
      <div className="flex min-w-0 items-center gap-3">
        <ProductThumb src={mainImageUrl(product)} />
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
      </div>
    ) : (
      <span className="text-muted-foreground">{line.productId}</span>
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
      header: "Prix unitaire",
      cell: ({ product }) => (product ? formatPrice(unitPrice(product)) : "—"),
      className: "text-right tabular-nums",
    },
    {
      key: "quantity",
      header: "Quantité",
      cell: ({ line, product }) => (
        <span className="tabular-nums">
          {line.quantity}
          {product ? (
            <span className="text-xs text-muted-foreground">
              {" "}
              / {product.stock} en stock
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "subtotal",
      header: "Sous-total",
      cell: (i) => formatPrice(i.subtotalInCents),
      className: "text-right font-medium tabular-nums",
    },
    {
      key: "availability",
      header: "Disponibilité",
      cell: (i) => <AvailabilityBadge value={i.availability} />,
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            cell: (i: Item) => (
              <RemoveLineButton
                kind="CART"
                userId={userId}
                productId={i.line.productId}
                productName={i.product?.name ?? i.line.productId}
                customerName={customerName}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Link
        href="/admin/carts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Paniers
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Panier de {customerName}
            </h1>
            {cart.summary.abandoned ? <AbandonedBadge /> : null}
          </div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/admin/users/${userId}`} className="hover:underline">
              Voir le compte
            </Link>
            {cart.items.length > 0
              ? ` · mis à jour le ${formatDateTime(cart.summary.updatedAt)}`
              : null}
          </p>
        </div>
        {canWrite && cart.items.length > 0 ? (
          <EmptyButton
            kind="CART"
            userId={userId}
            customerName={customerName}
            count={cart.items.length}
          />
        ) : null}
      </div>

      {cart.items.length === 0 ? (
        <EmptyState icon={ShoppingCartIcon} title="Ce panier est vide." />
      ) : (
        <>
          <DataTable
            caption={`Panier de ${customerName}`}
            rows={cart.items}
            columns={columns}
            rowKey={(i) => i.line.productId}
            renderCard={(i) => (
              <article className="rounded-lg border bg-surface p-4">
                {productCell(i)}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="tabular-nums">
                    {i.line.quantity} ×{" "}
                    {i.product ? formatPrice(unitPrice(i.product)) : "—"}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(i.subtotalInCents)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <AvailabilityBadge value={i.availability} />
                  {canWrite ? (
                    <RemoveLineButton
                      kind="CART"
                      userId={userId}
                      productId={i.line.productId}
                      productName={i.product?.name ?? i.line.productId}
                      customerName={customerName}
                    />
                  ) : null}
                </div>
              </article>
            )}
          />
          <p className="flex justify-end gap-4 text-base">
            <span className="text-muted-foreground">Total estimé</span>
            <strong className="tabular-nums">
              {formatPrice(cart.summary.valueInCents)}
            </strong>
          </p>
        </>
      )}
    </>
  );
}
