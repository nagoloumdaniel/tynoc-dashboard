"use client";

import { SearchInput } from "@/components/data-table/search-input";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Select } from "@/components/ui/select";

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
          onValueChange={(value) =>
            setFilters({ abandoned: value || undefined })
          }
          options={[
            { value: "", label: "Tous les paniers" },
            { value: "1", label: "Abandonnés (plus de 7 jours)" },
          ]}
        />
      ) : null}
      <Select
        aria-label="Trier par"
        value={sort}
        onValueChange={(value) =>
          setFilters({ sort: value === defaultSort ? undefined : value })
        }
        options={
          kind === "CART"
            ? [
                { value: "-updatedAt", label: "Modifiés récemment" },
                { value: "updatedAt", label: "Plus anciens" },
                { value: "-value", label: "Valeur la plus élevée" },
              ]
            : [
                { value: "-addedAt", label: "Ajouts récents" },
                { value: "-count", label: "Plus de produits" },
              ]
        }
      />
    </div>
  );
}
