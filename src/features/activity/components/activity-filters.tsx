"use client";

import { RotateCcwIcon } from "lucide-react";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PERIODS } from "@/features/dashboard/period";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_LABELS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/audit/actions";
import type { ActivityQuery } from "../schemas";

export function ActivityFilters({
  query,
  actors,
}: {
  query: ActivityQuery;
  actors: { email: string; name: string }[];
}) {
  const { setFilters, pending } = useUrlFilters();
  const filtered =
    query.period !== 30 ||
    query.entity !== undefined ||
    query.action !== undefined ||
    query.actor !== undefined;
  // An author filtered from a link may no longer be an admin: keep it listed.
  const actorOptions =
    query.actor && !actors.some((a) => a.email === query.actor)
      ? [...actors, { email: query.actor, name: query.actor }]
      : actors;

  return (
    <div
      aria-busy={pending}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(10rem,1fr))_auto]"
    >
      <Select
        aria-label="Période"
        value={String(query.period)}
        onValueChange={(value) =>
          setFilters({ period: value === "30" ? undefined : value })
        }
        options={PERIODS.map((period) => ({
          value: String(period),
          label: `${period} derniers jours`,
        }))}
      />
      <Select
        aria-label="Type d'élément"
        value={query.entity ?? ""}
        onValueChange={(value) => setFilters({ entity: value || undefined })}
        options={[
          { value: "", label: "Tous les éléments" },
          ...AUDIT_ENTITY_TYPES.map((type) => ({
            value: type,
            label: AUDIT_ENTITY_LABELS[type],
          })),
        ]}
      />
      <Select
        aria-label="Action"
        value={query.action ?? ""}
        onValueChange={(value) => setFilters({ action: value || undefined })}
        options={[
          { value: "", label: "Toutes les actions" },
          ...AUDIT_ACTIONS.map((action) => ({
            value: action,
            label: AUDIT_ACTION_LABELS[action],
          })),
        ]}
      />
      <Select
        aria-label="Auteur"
        value={query.actor ?? ""}
        onValueChange={(value) => setFilters({ actor: value || undefined })}
        options={[
          { value: "", label: "Tous les auteurs" },
          ...actorOptions.map((actor) => ({
            value: actor.email,
            label:
              actor.name === actor.email
                ? actor.email
                : `${actor.name} (${actor.email})`,
          })),
        ]}
      />
      {filtered ? (
        <Button
          variant="ghost"
          className="h-10"
          onClick={() =>
            setFilters({
              period: undefined,
              entity: undefined,
              action: undefined,
              actor: undefined,
            })
          }
        >
          <RotateCcwIcon aria-hidden />
          Réinitialiser
        </Button>
      ) : null}
    </div>
  );
}
