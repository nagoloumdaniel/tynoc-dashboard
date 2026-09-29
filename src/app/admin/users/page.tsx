import { SearchXIcon, UsersIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { CreateAdminDialog } from "@/features/users/components/create-admin-dialog";
import { UserFilters } from "@/features/users/components/user-filters";
import { UserTable } from "@/features/users/components/user-table";
import { USER_PAGE_SIZE } from "@/features/users/list";
import { userListQuerySchema } from "@/features/users/schemas";
import { listUsers } from "@/features/users/service";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { maskEmail } from "@/lib/format";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function UsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  const session = await requireAdmin();
  const query = userListQuerySchema.parse(await searchParams);
  const result = await listUsers(query);

  // Read-only admins see partial emails (personal data).
  const readOnly = session.role === "VIEWER";
  const filtered =
    query.q !== "" || query.type !== "all" || query.status !== "current";

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Comptes clients et administrateurs, rôles et statuts."
        actions={
          can(session.role, "admins:manage") ? <CreateAdminDialog /> : null
        }
      />
      <UserFilters query={query} />

      {result.total > 0 ? (
        <>
          <UserTable
            users={result.items}
            displayEmail={readOnly ? maskEmail : (email) => email}
          />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={USER_PAGE_SIZE}
          />
        </>
      ) : filtered ? (
        <EmptyState
          icon={SearchXIcon}
          title="Aucun compte ne correspond à vos filtres."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/users">Réinitialiser les filtres</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState icon={UsersIcon} title="Aucun compte pour l'instant." />
      )}
    </>
  );
}
