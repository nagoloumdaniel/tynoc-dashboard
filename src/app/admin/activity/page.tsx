import { HistoryIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/features/activity/components/activity-feed";
import { ActivityFilters } from "@/features/activity/components/activity-filters";
import { activityQuerySchema } from "@/features/activity/schemas";
import { listActivity, listActors } from "@/features/activity/service";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Activité" };

export default async function ActivityPage({
  searchParams,
}: PageProps<"/admin/activity">) {
  await requireAdmin();
  const query = activityQuerySchema.parse(await searchParams);
  const [page, actors] = await Promise.all([listActivity(query), listActors()]);

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
      <ActivityFilters query={query} actors={actors} />

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
