"use client";

import { SearchInput } from "@/components/data-table/search-input";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Select } from "@/components/ui/field";

/** Search, sort and (carts only) the abandoned filter, kept in the URL. */
export function ListFilters({
  kind,
  sort,
  abandoned,
}: {
  kind: "CART" | "WISHLIST";
  sort: string;
  abandoned?: boolean;
}) {
  const { setFilters, pending } = useUrlFilters();
  const defaultSort = kind === "CART" ? "-updatedAt" : "-addedAt";

  return (
    <div
      aria-busy={pending}
      className="grid gap-3 sm:grid-cols-[minmax(12rem,2fr)_repeat(2,minmax(11rem,1fr))]"
    >
      <SearchInput label="Rechercher un client" placeholder="Nom ou email" />
      {kind === "CART" ? (
        <Select
          aria-label="Paniers affichés"
          value={abandoned ? "1" : ""}
          onChange={(event) =>
            setFilters({ abandoned: event.target.value || undefined })
          }
        >
          <option value="">Tous les paniers</option>
          <option value="1">Abandonnés (plus de 7 jours)</option>
        </Select>
      ) : null}
      <Select
        aria-label="Trier par"
        value={sort}
        onChange={(event) =>
          setFilters({
            sort:
              event.target.value === defaultSort
                ? undefined
                : event.target.value,
          })
        }
      >
        {kind === "CART" ? (
          <>
            <option value="-updatedAt">Modifiés récemment</option>
            <option value="updatedAt">Plus anciens</option>
            <option value="-value">Valeur la plus élevée</option>
          </>
        ) : (
          <>
            <option value="-addedAt">Ajouts récents</option>
            <option value="-count">Plus de produits</option>
          </>
        )}
      </Select>
    </div>
  );
}
