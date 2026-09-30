import Link from "next/link";
import { type Column, DataTable } from "@/components/data-table/data-table";
import { mainImageUrl } from "../image-urls";
import type { ProductListItem } from "../types";
import { ProductStatusBadge, StockBadge } from "./badges";
import { Price } from "./price";
import { ProductThumb } from "./product-thumb";
import { RowActions } from "./row-actions";

function NameCell({ product }: { product: ProductListItem }) {
  return (
    <div className="flex items-center gap-3">
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
  );
}

export function ProductTable({
  products,
  categoryNames,
  canWrite,
}: {
  products: ProductListItem[];
  categoryNames: Map<string, string>;
  canWrite: boolean;
}) {
  const category = (id: string) => categoryNames.get(id) ?? "—";

  const columns: Column<ProductListItem>[] = [
    {
      key: "name",
      header: "Produit",
      cell: (p) => <NameCell product={p} />,
      className: "max-w-80",
    },
    {
      key: "category",
      header: "Catégorie",
      cell: (p) => category(p.categoryId),
    },
    {
      key: "price",
      header: "Prix",
      cell: (p) => <Price {...p} />,
      className: "text-right",
    },
    { key: "stock", header: "Stock", cell: (p) => <StockBadge {...p} /> },
    {
      key: "status",
      header: "Statut",
      cell: (p) => <ProductStatusBadge status={p.status} />,
    },
    {
      key: "createdAt",
      header: "Ajouté le",
      cell: (p) => (
        <time
          dateTime={p.createdAt}
          className="text-muted-foreground tabular-nums"
        >
          {new Date(p.createdAt).toLocaleDateString("fr-FR")}
        </time>
      ),
      className: "hidden lg:table-cell",
    },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            cell: (p: ProductListItem) =>
              p.status === "ARCHIVED" ? null : <RowActions product={p} />,
            className: "w-24",
          },
        ]
      : []),
  ];

  return (
    <DataTable
      caption="Produits"
      rows={products}
      columns={columns}
      rowKey={(p) => p.id}
      renderCard={(p) => (
        <article className="rounded-lg border bg-surface p-4">
          <NameCell product={p} />
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Prix</dt>
            <dd className="text-right">
              <Price {...p} />
            </dd>
            <dt className="text-muted-foreground">Stock</dt>
            <dd className="text-right">
              <StockBadge {...p} />
            </dd>
            <dt className="text-muted-foreground">Catégorie</dt>
            <dd className="truncate text-right">{category(p.categoryId)}</dd>
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="text-right">
              <ProductStatusBadge status={p.status} />
            </dd>
          </dl>
          {canWrite && p.status !== "ARCHIVED" ? (
            <div className="mt-3 border-t pt-2">
              <RowActions product={p} />
            </div>
          ) : null}
        </article>
      )}
    />
  );
}
