"use client";

import {
  CornerDownRightIcon,
  PencilIcon,
  PowerIcon,
  SearchIcon,
  TagsIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { type Column, DataTable } from "@/components/data-table/data-table";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { normalizeText } from "@/lib/format";
import { deleteCategoryAction, setCategoryActiveAction } from "../actions";
import type { CategoryNode } from "../tree";
import { CategoryDialog } from "./category-dialog";

type Row = { node: CategoryNode; parent?: CategoryNode };
type StatusFilter = "all" | "active" | "inactive";

function flatten(tree: CategoryNode[]): Row[] {
  return tree.flatMap((root) => [
    { node: root },
    ...root.children.map((child) => ({ node: child, parent: root })),
  ]);
}

function ActiveToggle({ node }: { node: CategoryNode }) {
  const [pending, startTransition] = useTransition();
  const label = node.isActive ? "Désactiver" : "Activer";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${label} ${node.name}`}
      title={label}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setCategoryActiveAction(
            node.id,
            node.version ?? 1,
            !node.isActive,
          );
          if (result.ok) toast.success(result.message);
          else toast.error(result.message);
        })
      }
    >
      <PowerIcon aria-hidden />
    </Button>
  );
}

function RowActions({
  row,
  parents,
}: {
  row: Row;
  parents: { id: string; name: string }[];
}) {
  const { node } = row;
  return (
    <div className="flex justify-end gap-1">
      <CategoryDialog
        parents={parents}
        category={{
          ...node,
          version: node.version ?? 1,
          hasChildren: node.children.length > 0,
        }}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Modifier ${node.name}`}
            title="Modifier"
          >
            <PencilIcon aria-hidden />
          </Button>
        }
      />
      <ActiveToggle node={node} />
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Supprimer ${node.name}`}
            title="Supprimer"
            className="text-danger hover:bg-danger/10"
          >
            <Trash2Icon aria-hidden />
          </Button>
        }
        title={`Supprimer « ${node.name} » ?`}
        description="Possible seulement si elle ne contient ni produit (même archivé) ni sous-catégorie."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          const result = await deleteCategoryAction(node.id, node.version ?? 1);
          if (result.ok) toast.success(result.message);
          return result;
        }}
      />
    </div>
  );
}

export function CategoryList({
  tree,
  canWrite,
}: {
  tree: CategoryNode[];
  canWrite: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const parents = tree.map(({ id, name }) => ({ id, name }));

  const rows = useMemo(() => {
    const term = normalizeText(search);
    return flatten(tree).filter(({ node, parent }) => {
      if (status === "active" && !node.isActive) return false;
      if (status === "inactive" && node.isActive) return false;
      if (!term) return true;
      return (
        normalizeText(node.name).includes(term) ||
        (parent ? normalizeText(parent.name).includes(term) : false)
      );
    });
  }, [tree, search, status]);

  if (tree.length === 0) {
    return (
      <EmptyState
        icon={TagsIcon}
        title="Aucune catégorie pour l'instant."
        description="Créez une première catégorie pour organiser le catalogue."
      />
    );
  }

  const name = ({ node, parent }: Row) => (
    <div className={parent ? "flex items-center gap-2 pl-6" : "font-medium"}>
      {parent ? (
        <CornerDownRightIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <span>
        {parent ? <span className="sr-only">{parent.name} › </span> : null}
        {node.name}
      </span>
    </div>
  );

  const products = ({ node }: Row) => (
    <Link
      href={`/admin/products?category=${node.id}`}
      className="tabular-nums hover:underline"
      title="Voir les produits"
    >
      {node.productCount}
    </Link>
  );

  const statusBadge = ({ node, parent }: Row) =>
    node.isActive && parent && !parent.isActive ? (
      <Badge tone="warning">Parent inactif</Badge>
    ) : (
      <Badge tone={node.isActive ? "success" : "neutral"}>
        {node.isActive ? "Active" : "Inactive"}
      </Badge>
    );

  const columns: Column<Row>[] = [
    { key: "name", header: "Nom", cell: name },
    {
      key: "slug",
      header: "Slug",
      cell: ({ node }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {node.slug}
        </span>
      ),
    },
    {
      key: "products",
      header: "Produits",
      cell: products,
      className: "text-right",
    },
    { key: "status", header: "Statut", cell: statusBadge },
    ...(canWrite
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            cell: (row: Row) => <RowActions row={row} parents={parents} />,
            className: "w-32",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Rechercher une catégorie"
            placeholder="Nom de catégorie"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-md border bg-surface pr-3 pl-9 text-sm shadow-xs"
          />
        </div>
        <Select
          aria-label="Statut"
          value={status}
          onValueChange={(value) => setStatus(value as StatusFilter)}
          options={[
            { value: "all", label: "Toutes" },
            { value: "active", label: "Actives" },
            { value: "inactive", label: "Inactives" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="Aucune catégorie ne correspond."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
            >
              Réinitialiser les filtres
            </Button>
          }
        />
      ) : (
        <DataTable
          caption="Catégories"
          rows={rows}
          columns={columns}
          rowKey={({ node }) => node.id}
          renderCard={(row) => (
            <article className="rounded-lg border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {row.parent ? (
                    <p className="text-xs text-muted-foreground">
                      {row.parent.name} ›
                    </p>
                  ) : null}
                  <p className="font-medium">{row.node.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {row.node.slug}
                  </p>
                </div>
                {statusBadge(row)}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {products(row)} produit(s)
              </p>
              {canWrite ? (
                <div className="mt-3 border-t pt-2">
                  <RowActions row={row} parents={parents} />
                </div>
              ) : null}
            </article>
          )}
        />
      )}
    </div>
  );
}
