import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategoryLabels } from "@/features/categories/service";
import {
  ProductStatusBadge,
  StockBadge,
} from "@/features/products/components/badges";
import { Price } from "@/features/products/components/price";
import { ProductActions } from "@/features/products/components/product-actions";
import {
  getProduct,
  getProductActivity,
  getProductUsage,
} from "@/features/products/service";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Fiche produit" };

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  STOCK_ADJUST: "Stock",
  ARCHIVE: "Archivage",
  RESTORE: "Restauration",
  DELETE: "Suppression",
};

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-surface p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default async function ProductPage({
  params,
}: PageProps<"/admin/products/[productId]">) {
  const session = await requireAdmin();
  const { productId } = await params;
  const product = await getProduct(productId);
  if (!product) notFound();

  const [labels, usage, activity] = await Promise.all([
    listCategoryLabels(),
    getProductUsage(product.id),
    getProductActivity(product.id, 10),
  ]);

  return (
    <>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Produits
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {product.name}
            </h1>
            <ProductStatusBadge status={product.status} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {product.sku}
          </p>
        </div>
        <ProductActions
          product={product}
          canWrite={can(session.role, "products:write")}
          canDelete={can(session.role, "products:delete")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card title="Informations">
            <dl className="divide-y">
              <Row label="Catégorie">
                {labels.get(product.categoryId) ?? "—"}
              </Row>
              <Row label="Slug">
                <span className="font-mono">{product.slug}</span>
              </Row>
              <Row label="Prix">
                <Price {...product} />
              </Row>
              <Row label="Créé le">
                {dateTime.format(new Date(product.createdAt))}
              </Row>
              <Row label="Modifié le">
                {dateTime.format(new Date(product.updatedAt))}
              </Row>
              {product.archivedAt ? (
                <Row label="Archivé le">
                  {dateTime.format(new Date(product.archivedAt))}
                </Row>
              ) : null}
            </dl>
            {product.description ? (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Pas de description.
              </p>
            )}
          </Card>

          <Card title="Historique">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune action.</p>
            ) : (
              <ol className="space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <span className="w-28 shrink-0 font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate">{entry.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorEmail} ·{" "}
                        {dateTime.format(new Date(entry.createdAt))}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Stock">
            <StockBadge {...product} />
            <p className="mt-3 text-sm text-muted-foreground">
              Signalé en stock faible à {product.lowStockThreshold} unité(s) ou
              moins.
            </p>
          </Card>

          <Card title="Chez les clients">
            <dl className="divide-y">
              <Row label="Dans des paniers">{usage.carts}</Row>
              <Row label="Dans des wishlists">{usage.wishlists}</Row>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
