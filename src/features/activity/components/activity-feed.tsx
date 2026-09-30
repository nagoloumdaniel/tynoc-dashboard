"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/features/carts/components/shared";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
  auditEntityHref,
} from "@/lib/audit/actions";
import { loadMoreActivityAction } from "../actions";
import { describeChanges } from "../changes";
import type { ActivityItem } from "../service";

function Entry({ entry }: { entry: ActivityItem }) {
  const changes = describeChanges(entry.changes);
  return (
    <li className="py-3">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
        <time
          dateTime={entry.createdAt}
          className="shrink-0 text-xs text-muted-foreground tabular-nums sm:w-36"
        >
          {formatDateTime(entry.createdAt)}
        </time>
        <div className="min-w-0 flex-1">
          <Link
            href={auditEntityHref(entry.entityType, entry.entityId)}
            className="text-sm font-medium break-words hover:underline"
          >
            {entry.summary}
          </Link>
          <p className="text-xs text-muted-foreground">
            {AUDIT_ACTION_LABELS[entry.action] ?? entry.action} ·{" "}
            {AUDIT_ENTITY_LABELS[entry.entityType] ?? entry.entityType} ·{" "}
            {entry.actorEmail}
          </p>
          {changes.length > 0 ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                Voir les modifications ({changes.length})
              </summary>
              <dl className="mt-2 space-y-1 rounded-md bg-surface-muted p-3 text-xs">
                {changes.map((change) => (
                  <div
                    key={change.field}
                    className="grid gap-x-3 sm:grid-cols-[10rem_1fr]"
                  >
                    <dt className="font-medium">{change.label}</dt>
                    <dd className="min-w-0 break-words">
                      <span className="text-muted-foreground">
                        {change.from}
                      </span>
                      <span aria-hidden> → </span>
                      <span className="sr-only"> devient </span>
                      {change.to}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** The first page is server-rendered; "Voir plus" appends the next ones. */
export function ActivityFeed({
  initialItems,
  initialCursor,
  params,
}: {
  initialItems: ActivityItem[];
  initialCursor: string | null;
  params: Record<string, string | undefined>;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await loadMoreActivityAction(params, cursor);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setItems((current) => [...current, ...result.data.items]);
      setCursor(result.data.nextCursor);
    });
  }

  return (
    <div className="rounded-lg border bg-surface px-4">
      <ol className="divide-y">
        {items.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </ol>
      <div className="flex flex-col items-center gap-2 border-t py-4">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {items.length} entrée(s) affichée(s)
          {cursor ? "" : " · fin du journal pour cette période"}
        </p>
        {cursor ? (
          <Button variant="outline" onClick={loadMore} disabled={pending}>
            {pending ? "Chargement…" : "Voir plus"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
