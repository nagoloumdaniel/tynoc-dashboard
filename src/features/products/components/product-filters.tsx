"use client";

import { RotateCcwIcon } from "lucide-react";
import Link from "next/link";
import { SearchInput } from "@/components/data-table/search-input";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ListStatus, ProductListQuery, ProductSort } from "../schemas";

const STATUS_TABS: { value: ListStatus; label: string }[] = [
  { value: "current", label: "Actifs et brouillons" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "ARCHIVED", label: "Archivés" },
];

const SORT_LABELS: Record<ProductSort, string> = {
  "-createdAt": "Plus récents",
  createdAt: "Plus anciens",
  name: "Nom (A → Z)",
  "-name": "Nom (Z → A)",
  price: "Prix croissant",
  "-price": "Prix décroissant",
  stock: "Stock croissant",
  "-stock": "Stock décroissant",
};

export function ProductFilters({
  query,
  categories,
}: {
  query: ProductListQuery;
  categories: { id: string; label: string }[];
}) {
  const { hrefWith, setFilters, pending } = useUrlFilters();
  const filtered =
    query.q !== "" ||
    query.category !== undefined ||
    query.stock !== undefined ||
    query.sort !== "-createdAt";

  return (
    <div className="space-y-4" aria-busy={pending}>
      <nav
        aria-label="Statut"
        className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex min-w-max gap-1 border-b">
          {STATUS_TABS.map((tab) => {
            const active = query.status === tab.value;
            return (
              <li key={tab.value}>
                <Link
                  href={hrefWith({
                    status: tab.value === "current" ? undefined : tab.value,
                    page: undefined,
                  })}
                  aria-current={active ? "page" : undefined}
                  scroll={false}
                  className={cn(
                    "-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(11rem,1fr))_auto]">
        <SearchInput
          label="Rechercher un produit"
          placeholder="Nom ou SKU"
          className="sm:col-span-2 lg:col-span-1"
        />
        <Select
          aria-label="Catégorie"
          value={query.category ?? ""}
          onChange={(event) =>
            setFilters({ category: event.target.value || undefined })
          }
        >
          <option value="">Toutes les catégories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Niveau de stock"
          value={query.stock ?? ""}
          onChange={(event) =>
            setFilters({ stock: event.target.value || undefined })
          }
        >
          <option value="">Tous les stocks</option>
          <option value="in">En stock</option>
          <option value="low">Stock faible</option>
          <option value="out">Rupture</option>
        </Select>
        <Select
          aria-label="Trier par"
          value={query.sort}
          onChange={(event) =>
            setFilters({
              sort:
                event.target.value === "-createdAt"
                  ? undefined
                  : event.target.value,
            })
          }
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {filtered ? (
          <Button
            variant="ghost"
            className="h-10"
            onClick={() =>
              setFilters({
                q: undefined,
                category: undefined,
                stock: undefined,
                sort: undefined,
              })
            }
          >
            <RotateCcwIcon aria-hidden />
            Réinitialiser
          </Button>
        ) : null}
      </div>
    </div>
  );
}
