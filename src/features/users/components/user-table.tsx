import Link from "next/link";
import { type Column, DataTable } from "@/components/data-table/data-table";
import type { UserListItem } from "../types";
import { Avatar, RoleBadge, UserStatusBadge } from "./badges";

const date = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR") : "—";

function Identity({
  user,
  displayEmail,
}: {
  user: UserListItem;
  displayEmail: (email: string) => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={user.name} />
      <div className="min-w-0">
        <Link
          href={`/admin/users/${user.id}`}
          className="block truncate font-medium hover:underline"
        >
          {user.name}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">
          {displayEmail(user.email)}
        </span>
      </div>
    </div>
  );
}

export function UserTable({
  users,
  displayEmail,
}: {
  users: UserListItem[];
  /** Masks emails for read-only admins. */
  displayEmail: (email: string) => string;
}) {
  const columns: Column<UserListItem>[] = [
    {
      key: "user",
      header: "Compte",
      cell: (u) => <Identity user={u} displayEmail={displayEmail} />,
      className: "max-w-80",
    },
    { key: "role", header: "Rôle", cell: (u) => <RoleBadge role={u.role} /> },
    {
      key: "status",
      header: "Statut",
      cell: (u) => <UserStatusBadge status={u.status} />,
    },
    {
      key: "createdAt",
      header: "Inscription",
      cell: (u) => (
        <span className="text-muted-foreground tabular-nums">
          {date(u.createdAt)}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Dernière connexion",
      cell: (u) => (
        <span className="text-muted-foreground tabular-nums">
          {date(u.lastLoginAt)}
        </span>
      ),
      className: "hidden lg:table-cell",
    },
  ];

  return (
    <DataTable
      caption="Comptes"
      rows={users}
      columns={columns}
      rowKey={(u) => u.id}
      renderCard={(u) => (
        <article className="rounded-lg border bg-surface p-4">
          <Identity user={u} displayEmail={displayEmail} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RoleBadge role={u.role} />
            <UserStatusBadge status={u.status} />
            <span className="ml-auto text-xs text-muted-foreground">
              Inscrit le {date(u.createdAt)}
            </span>
          </div>
        </article>
      )}
    />
  );
}
