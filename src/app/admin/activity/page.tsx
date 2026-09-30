import { HistoryIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { ActivityFilters } from "@/features/activity/components/activity-filters";
import { activityQuerySchema } from "@/features/activity/schemas";
import { forReader } from "@/features/activity/privacy";
import { listActivity, listActors } from "@/features/activity/service";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Activité" };

export default async function ActivityPage({
  searchParams,
}: PageProps<"/admin/activity">) {
  const session = await requireAdmin();
  const reader = session.role === "VIEWER";
  const parsed = activityQuerySchema.parse(await searchParams);
  // Read-only admins get neither the author list nor the author filter:
  // it would reveal the admins' addresses.
  const query = reader ? { ...parsed, actor: undefined } : parsed;
  const [result, actors] = await Promise.all([
    listActivity(query),
    reader ? [] : listActors(),
  ]);
  const page = { ...result, items: forReader(result.items, session.role) };

  // Only validated values travel back to the "Voir plus" action.
  const params = {
    period: String(query.period),
    entity: query.entity,
    action: query.action,
    actor: query.actor,
  };
  const filtered =
    query.entity !== undefined ||
    query.action !== undefined ||
    query.actor !== undefined;

  return (
    <>
      <PageHeader
        title="Activité"
        description="Historique des actions effectuées par les administrateurs, du plus récent au plus ancien."
      />
      <ActivityFilters query={query} actors={actors} showActor={!reader} />

      {page.items.length > 0 ? (
        <ActivityFeed
          key={JSON.stringify(params)}
          initialItems={page.items}
          initialCursor={page.nextCursor}
          params={params}
        />
      ) : filtered ? (
        <EmptyState
          icon={SearchXIcon}
          title="Aucune action ne correspond à vos filtres."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/activity">Réinitialiser les filtres</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState
          icon={HistoryIcon}
          title={`Aucune action sur les ${query.period} derniers jours.`}
          description="Les connexions et les modifications des administrateurs apparaîtront ici."
        />
      )}
    </>
  );
}
