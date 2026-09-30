import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/page-header";
import { PeriodSelector } from "@/features/dashboard/components/period-selector";
import {
  ChartsSection,
  ChartsSkeleton,
  FiguresSkeleton,
  KpiSection,
  LatestCustomersWidget,
  LatestProductsWidget,
  MovementSection,
  RecentActivityWidget,
  StockAlertsWidget,
  WidgetSkeleton,
} from "@/features/dashboard/components/sections";
import { WidgetBoundary } from "@/features/dashboard/components/widget-boundary";
import { parsePeriod } from "@/features/dashboard/period";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Tableau de bord" };

/** Each block streams on its own and fails on its own. */
export default async function DashboardPage({
  searchParams,
}: PageProps<"/admin">) {
  const session = await requireAdmin();
  const period = parsePeriod((await searchParams).period);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble du catalogue, des clients et de l'activité."
        actions={<PeriodSelector value={period} basePath="/admin" />}
      />

      <WidgetBoundary title="Indicateurs">
        <Suspense fallback={<FiguresSkeleton count={7} />}>
          <KpiSection period={period} />
        </Suspense>
      </WidgetBoundary>

      <WidgetBoundary title="Mouvements">
        <Suspense fallback={<FiguresSkeleton count={5} />}>
          <MovementSection period={period} />
        </Suspense>
      </WidgetBoundary>

      <WidgetBoundary title="Graphiques">
        <Suspense fallback={<ChartsSkeleton />}>
          <ChartsSection period={period} />
        </Suspense>
      </WidgetBoundary>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WidgetBoundary title="Alertes de stock">
          <Suspense fallback={<WidgetSkeleton />}>
            <StockAlertsWidget />
          </Suspense>
        </WidgetBoundary>
        <WidgetBoundary title="Activité récente">
          <Suspense fallback={<WidgetSkeleton />}>
            <RecentActivityWidget period={period} />
          </Suspense>
        </WidgetBoundary>
        <WidgetBoundary title="Derniers produits">
          <Suspense fallback={<WidgetSkeleton />}>
            <LatestProductsWidget />
          </Suspense>
        </WidgetBoundary>
        <WidgetBoundary title="Derniers clients">
          <Suspense fallback={<WidgetSkeleton />}>
            <LatestCustomersWidget maskEmails={session.role === "VIEWER"} />
          </Suspense>
        </WidgetBoundary>
      </div>
    </>
  );
}
