import { HeartIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { type Column, DataTable } from "@/components/data-table/data-table";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ListFilters } from "@/features/carts/components/list-filters";
import { formatDateTime } from "@/features/carts/components/shared";
import { wishlistListQuerySchema } from "@/features/carts/schemas";
import { listWishlists } from "@/features/carts/service";
import { LIST_PAGE_SIZE, type WishlistRow } from "@/features/carts/summary";
import { requireAdmin } from "@/lib/auth/dal";
import { maskEmail } from "@/lib/format";

export const metadata: Metadata = { title: "Wishlists" };

export default async function WishlistsPage({
  searchParams,
}: PageProps<"/admin/wishlists">) {
  const session = await requireAdmin();
  const query = wishlistListQuerySchema.parse(await searchParams);
  const result = await listWishlists(query);
  const email = (value: string) =>
    session.role === "VIEWER" ? maskEmail(value) : value;

  const customer = (row: WishlistRow) => (
    <div className="min-w-0">
      <Link
        href={`/admin/wishlists/${row.userId}`}
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

  const columns: Column<WishlistRow>[] = [
    {
      key: "customer",
      header: "Client",
      cell: customer,
      className: "max-w-72",
    },
    {
      key: "count",
      header: "Produits",
      cell: (r) => <span className="tabular-nums">{r.count}</span>,
    },
    {
      key: "lastAddedAt",
      header: "Dernier ajout",
      cell: (r) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDateTime(r.lastAddedAt)}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Wishlists"
        description="Produits sauvegardés par les clients."
      />
      <ListFilters kind="WISHLIST" sort={query.sort} />
      {result.total > 0 ? (
        <>
          <DataTable
            caption="Wishlists"
            rows={result.items}
            columns={columns}
            rowKey={(r) => r.userId}
            renderCard={(r) => (
              <article className="rounded-lg border bg-surface p-4">
                {customer(r)}
                <p className="mt-3 text-sm text-muted-foreground">
                  {r.count} produit(s) · dernier ajout le{" "}
                  {formatDateTime(r.lastAddedAt)}
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
      ) : query.q ? (
        <EmptyState
          icon={SearchXIcon}
          title="Aucune wishlist ne correspond à votre recherche."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/wishlists">Réinitialiser la recherche</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={HeartIcon}
          title="Aucune wishlist pour l'instant."
          description="Les produits sauvegardés par les clients apparaîtront ici."
        />
      )}
    </>
  );
}
