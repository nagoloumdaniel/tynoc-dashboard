import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CategoryDialog } from "@/features/categories/components/category-dialog";
import { CategoryList } from "@/features/categories/components/category-list";
import { listCategoryTree } from "@/features/categories/service";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Catégories" };

export default async function CategoriesPage() {
  const session = await requireAdmin();
  const tree = await listCategoryTree();
  const canWrite = can(session.role, "categories:write");

  return (
    <>
      <PageHeader
        title="Catégories"
        description="Organisation du catalogue en catégories et sous-catégories."
        actions={
          canWrite ? (
            <CategoryDialog
              parents={tree.map(({ id, name }) => ({ id, name }))}
              trigger={
                <Button>
                  <PlusIcon aria-hidden />
                  Nouvelle catégorie
                </Button>
              }
            />
          ) : null
        }
      />
      <CategoryList tree={tree} canWrite={canWrite} />
    </>
  );
}
