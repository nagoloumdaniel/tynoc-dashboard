"use client";

import { RotateCcwIcon } from "lucide-react";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
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
        value={query.period}
        onChange={(event) =>
          setFilters({
            period:
              event.target.value === "30" ? undefined : event.target.value,
          })
        }
      >
        {PERIODS.map((period) => (
          <option key={period} value={period}>
            {period} derniers jours
          </option>
        ))}
      </Select>
      <Select
        aria-label="Type d'élément"
        value={query.entity ?? ""}
        onChange={(event) =>
          setFilters({ entity: event.target.value || undefined })
        }
      >
        <option value="">Tous les éléments</option>
        {AUDIT_ENTITY_TYPES.map((type) => (
          <option key={type} value={type}>
            {AUDIT_ENTITY_LABELS[type]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Action"
        value={query.action ?? ""}
        onChange={(event) =>
          setFilters({ action: event.target.value || undefined })
        }
      >
        <option value="">Toutes les actions</option>
        {AUDIT_ACTIONS.map((action) => (
          <option key={action} value={action}>
            {AUDIT_ACTION_LABELS[action]}
          </option>
        ))}
      </Select>
      <Select
        aria-label="Auteur"
        value={query.actor ?? ""}
        onChange={(event) =>
          setFilters({ actor: event.target.value || undefined })
        }
      >
        <option value="">Tous les auteurs</option>
        {actorOptions.map((actor) => (
          <option key={actor.email} value={actor.email}>
            {actor.name === actor.email
              ? actor.email
              : `${actor.name} (${actor.email})`}
          </option>
        ))}
      </Select>
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
