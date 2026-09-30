"use client";

import { RotateCcwIcon } from "lucide-react";
import { SearchInput } from "@/components/data-table/search-input";
import { useUrlFilters } from "@/components/data-table/use-url-filters";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
        onValueChange={(value) =>
          setFilters({ type: value === "all" ? undefined : value })
        }
        options={[
          { value: "all", label: "Tous les comptes" },
          { value: "customers", label: "Clients" },
          { value: "admins", label: "Administrateurs" },
        ]}
      />
      <Select
        aria-label="Statut"
        value={query.status}
        onValueChange={(value) =>
          setFilters({ status: value === "current" ? undefined : value })
        }
        options={[
          { value: "current", label: "Actifs et suspendus" },
          { value: "ACTIVE", label: "Actifs" },
          { value: "SUSPENDED", label: "Suspendus" },
          { value: "DELETED", label: "Anonymisés" },
        ]}
      />
      <Select
        aria-label="Trier par"
        value={query.sort}
        onValueChange={(value) =>
          setFilters({ sort: value === "-createdAt" ? undefined : value })
        }
        options={[
          { value: "-createdAt", label: "Plus récents" },
          { value: "createdAt", label: "Plus anciens" },
          { value: "name", label: "Nom (A → Z)" },
        ]}
      />
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
