import { SearchXIcon, ShoppingCartIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { type Column, DataTable } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ListFilters } from "@/features/carts/components/list-filters";
import {
  AbandonedBadge,
  formatDateTime,
} from "@/features/carts/components/shared";
import { cartListQuerySchema } from "@/features/carts/schemas";
import { listCarts } from "@/features/carts/service";
import { type CartRow, LIST_PAGE_SIZE } from "@/features/carts/summary";
import { getProduct } from "@/features/products/service";
import { requireAdmin } from "@/lib/auth/dal";
import { formatPrice, maskEmail } from "@/lib/format";

export const metadata: Metadata = { title: "Paniers" };

export default async function CartsPage({
  searchParams,
}: PageProps<"/admin/carts">) {
  const session = await requireAdmin();
  const query = cartListQuerySchema.parse(await searchParams);
  const [result, product] = await Promise.all([
    listCarts(query),
    query.product ? getProduct(query.product) : null,
  ]);
  const email = (value: string) =>
    session.role === "VIEWER" ? maskEmail(value) : value;

  const customer = (row: CartRow) => (
    <div className="min-w-0">
      <Link
        href={`/admin/carts/${row.userId}`}
        className="block truncate font-medium hover:underline"
      >
        {row.customer?.name ?? "Compte introuvable"}
      </Link>
      {row.customer ? (
        <span className="block truncate text-xs text-muted-foreground">
          {email(row.customer.email)}
        </span>
      ) : null}
    </div>
  );

  const columns: Column<CartRow>[] = [
    {
      key: "customer",
      header: "Client",
      cell: customer,
      className: "max-w-72",
    },
    {
      key: "lines",
      header: "Articles",
      cell: (r) => (
        <span className="tabular-nums">
          {r.lines} ligne(s) · {r.quantity} unité(s)
        </span>
      ),
    },
    {
      key: "value",
      header: "Valeur estimée",
      cell: (r) => (
        <span className="font-medium tabular-nums">
          {formatPrice(r.valueInCents)}
        </span>
      ),
      className: "text-right",
    },
    {
      key: "updatedAt",
      header: "Dernière mise à jour",
      cell: (r) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(r.updatedAt)}
        </span>
      ),
    },
    {
      key: "state",
      header: <span className="sr-only">État</span>,
      cell: (r) => (r.abandoned ? <AbandonedBadge /> : null),
    },
  ];

  const filtered = query.q !== "" || query.abandoned !== undefined;

  return (
    <>
      <PageHeader
        title="Paniers"
        description="Paniers en cours des clients, valeur estimée au prix actuel."
      />
      {product ? (
        <p className="flex flex-wrap items-center gap-2 rounded-md border bg-surface px-3 py-2 text-sm">
          Paniers contenant{" "}
          <Link
            href={`/admin/products/${product.id}`}
            className="font-medium hover:underline"
          >
            {product.name}
          </Link>
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link href="/admin/carts">
              <XIcon aria-hidden />
              Tous les paniers
            </Link>
          </Button>
        </p>
      ) : null}
      <ListFilters
        kind="CART"
        sort={query.sort}
        abandoned={query.abandoned === "1"}
      />

      {result.total > 0 ? (
        <>
          <DataTable
            caption="Paniers"
            rows={result.items}
            columns={columns}
            rowKey={(r) => r.userId}
            renderCard={(r) => (
              <article className="rounded-lg border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  {customer(r)}
                  {r.abandoned ? <AbandonedBadge /> : null}
                </div>
                <p className="mt-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {r.quantity} unité(s)
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatPrice(r.valueInCents)}
                  </span>
                </p>
              </article>
            )}
          />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={LIST_PAGE_SIZE}
          />
        </>
      ) : filtered ? (
        <EmptyState
          icon={SearchXIcon}
          title="Aucun panier ne correspond à vos filtres."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/carts">Réinitialiser les filtres</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={ShoppingCartIcon}
          title="Aucun panier en cours."
          description="Les paniers des clients de la boutique apparaîtront ici."
        />
      )}
    </>
  );
}
