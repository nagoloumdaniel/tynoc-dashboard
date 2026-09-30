import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { listActivity } from "@/features/activity/service";
import { formatDateTime } from "@/features/carts/components/shared";
import { StockBadge } from "@/features/products/components/badges";
import { AUDIT_ACTION_LABELS, auditEntityHref } from "@/lib/audit/actions";
import { maskEmail } from "@/lib/format";
import type { Period } from "../period";
import {
  getChartData,
  getKpis,
  getLatestCustomers,
  getLatestProducts,
  getMovements,
  getStockAlerts,
} from "../service";
import { ChartCard } from "./chart-card";
import { KpiCard } from "./kpi-card";

// ---- Figures -----------------------------------------------------------------

export async function KpiSection({ period }: { period: Period }) {
  const kpis = await getKpis(period);
  return (
    <section aria-labelledby="kpi-title" className="space-y-3">
      <h2 id="kpi-title" className="text-sm font-medium text-muted-foreground">
        Aujourd&apos;hui
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard
          label="Utilisateurs"
          comparison={kpis.totalUsers}
          period={period}
          href="/admin/users"
        />
        <KpiCard
          label="Produits"
          comparison={kpis.totalProducts}
          period={period}
          href="/admin/products"
        />
        <KpiCard
          label="Catégories"
          comparison={kpis.totalCategories}
          period={period}
          href="/admin/categories"
          rising="neutral"
        />
        <KpiCard
          label="Articles en panier"
          comparison={kpis.cartItems}
          period={period}
          href="/admin/carts"
        />
        <KpiCard
          label="Articles en wishlist"
          comparison={kpis.wishlistItems}
          period={period}
          href="/admin/wishlists"
        />
        <KpiCard
          label="En rupture"
          comparison={kpis.outOfStock}
          period={period}
          href="/admin/products?stock=out"
          rising="bad"
        />
        <KpiCard
          label="Stock faible"
          comparison={kpis.lowStock}
          period={period}
          href="/admin/products?stock=low"
          rising="bad"
        />
      </div>
    </section>
  );
}

export async function MovementSection({ period }: { period: Period }) {
  const movements = await getMovements(period);
  return (
    <section aria-labelledby="movement-title" className="space-y-3">
      <h2
        id="movement-title"
        className="text-sm font-medium text-muted-foreground"
      >
        Sur les {period} derniers jours
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Nouveaux clients"
          comparison={movements.newCustomers}
          period={period}
          href="/admin/users?type=customers"
        />
        <KpiCard
          label="Nouveaux produits"
          comparison={movements.newProducts}
          period={period}
          href="/admin/products"
        />
        <KpiCard
          label="Ajouts au panier"
          comparison={movements.cartAdditions}
          period={period}
          href="/admin/carts"
        />
        <KpiCard
          label="Ajouts en wishlist"
          comparison={movements.wishlistAdditions}
          period={period}
          href="/admin/wishlists"
        />
        <KpiCard
          label="Actions des admins"
          comparison={movements.adminActions}
          period={period}
          href={`/admin/activity?period=${period}`}
          rising="neutral"
        />
      </div>
    </section>
  );
}

export function FiguresSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

// ---- Charts ------------------------------------------------------------------

export async function ChartsSection({ period }: { period: Period }) {
  const charts = await getChartData(period);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <ChartCard
          title="Nouveaux clients par jour"
          description={`Comptes clients créés sur les ${period} derniers jours.`}
          data={charts.newCustomersPerDay}
          orientation="vertical"
          unit="client(s)"
          labelHeader="Jour"
          emptyText="Aucun nouveau client sur la période."
        />
      </div>
      <ChartCard
        title="Produits par catégorie"
        description="Nombre de produits rattachés à chaque catégorie."
        data={charts.productsPerCategory}
        orientation="horizontal"
        unit="produit(s)"
        labelHeader="Catégorie"
        emptyText="Aucun produit classé pour l'instant."
      />
      <ChartCard
        title="Les plus ajoutés en wishlist"
        description="Produits présents dans le plus de wishlists."
        data={charts.topWishlisted}
        orientation="horizontal"
        unit="wishlist(s)"
        labelHeader="Produit"
        emptyText="Aucune wishlist pour l'instant."
      />
    </div>
  );
}

export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-80 lg:col-span-2" />
      <Skeleton className="h-80" />
      <Skeleton className="h-80" />
    </div>
  );
}

// ---- Widgets -----------------------------------------------------------------

function Widget({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col rounded-lg border bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <Link
          href={href}
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
);

export async function StockAlertsWidget() {
  const products = await getStockAlerts(8);
  return (
    <Widget
      title="Alertes de stock"
      href="/admin/products?stock=low"
      linkLabel="Tout voir"
    >
      {products.length === 0 ? (
        <Empty>Aucun produit en rupture ou en stock faible.</Empty>
      ) : (
        <ul className="divide-y">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <Link
                href={`/admin/products/${product.id}`}
                className="min-w-0 truncate hover:underline"
              >
                {product.name}
              </Link>
              <StockBadge
                stock={product.stock}
                lowStockThreshold={product.lowStockThreshold}
              />
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export async function LatestProductsWidget() {
  const products = await getLatestProducts(5);
  return (
    <Widget
      title="Derniers produits"
      href="/admin/products"
      linkLabel="Tout voir"
    >
      {products.length === 0 ? (
        <Empty>Aucun produit.</Empty>
      ) : (
        <ul className="divide-y">
          {products.map((product) => (
            <li key={product.id} className="py-2 text-sm">
              <Link
                href={`/admin/products/${product.id}`}
                className="block truncate hover:underline"
              >
                {product.name}
              </Link>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatDateTime(product.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export async function LatestCustomersWidget({
  maskEmails,
}: {
  maskEmails: boolean;
}) {
  const customers = await getLatestCustomers(5);
  return (
    <Widget
      title="Derniers clients"
      href="/admin/users?type=customers"
      linkLabel="Tout voir"
    >
      {customers.length === 0 ? (
        <Empty>Aucun client.</Empty>
      ) : (
        <ul className="divide-y">
          {customers.map((customer) => (
            <li key={customer.id} className="py-2 text-sm">
              <Link
                href={`/admin/users/${customer.id}`}
                className="block truncate hover:underline"
              >
                {customer.name}
              </Link>
              <span className="block truncate text-xs text-muted-foreground">
                {maskEmails ? maskEmail(customer.email) : customer.email}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Widget>
  );
}

export async function RecentActivityWidget({ period }: { period: Period }) {
  const { items } = await listActivity({ period }, undefined, 8);
  return (
    <Widget
      title="Activité récente"
      href={`/admin/activity?period=${period}`}
      linkLabel="Journal complet"
    >
      {items.length === 0 ? (
        <Empty>Aucune action sur la période.</Empty>
      ) : (
        <ol className="divide-y">
          {items.map((entry) => (
            <li key={entry.id} className="py-2 text-sm">
              {/* The summary already names the action ("Connexion à…"). */}
              <Link
                href={auditEntityHref(entry.entityType, entry.entityId)}
                className="block truncate hover:underline"
              >
                {entry.summary}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {AUDIT_ACTION_LABELS[entry.action] ?? entry.action} ·{" "}
                {entry.actorEmail} · {formatDateTime(entry.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Widget>
  );
}

export const WidgetSkeleton = () => <Skeleton className="h-72" />;
