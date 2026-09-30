"use client";

import { RotateCcwIcon } from "lucide-react";
import { SearchInput } from "@/components/data-table/search-input";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import type { UserListQuery } from "../schemas";

export function UserFilters({ query }: { query: UserListQuery }) {
  const { setFilters, pending } = useUrlFilters();
  const filtered =
    query.q !== "" ||
    query.type !== "all" ||
    query.status !== "current" ||
    query.sort !== "-createdAt";

  return (
    <div
      aria-busy={pending}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(10rem,1fr))_auto]"
    >
      <SearchInput
        label="Rechercher un compte"
        placeholder="Nom ou email"
        className="sm:col-span-2 lg:col-span-1"
      />
      <Select
        aria-label="Type de compte"
        value={query.type}
        onChange={(event) =>
          setFilters({
            type: event.target.value === "all" ? undefined : event.target.value,
          })
        }
      >
        <option value="all">Tous les comptes</option>
        <option value="customers">Clients</option>
        <option value="admins">Administrateurs</option>
      </Select>
      <Select
        aria-label="Statut"
        value={query.status}
        onChange={(event) =>
          setFilters({
            status:
              event.target.value === "current" ? undefined : event.target.value,
          })
        }
      >
        <option value="current">Actifs et suspendus</option>
        <option value="ACTIVE">Actifs</option>
        <option value="SUSPENDED">Suspendus</option>
        <option value="DELETED">Anonymisés</option>
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
        <option value="-createdAt">Plus récents</option>
        <option value="createdAt">Plus anciens</option>
        <option value="name">Nom (A → Z)</option>
      </Select>
      {filtered ? (
        <Button
          variant="ghost"
          className="h-10"
          onClick={() =>
            setFilters({
              q: undefined,
              type: undefined,
              status: undefined,
              sort: undefined,
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
