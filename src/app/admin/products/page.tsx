import { PackageIcon, PlusIcon, SearchXIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/data-table/pagination";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { listActiveCategories } from "@/features/categories/repository";
import { ProductFilters } from "@/features/products/components/product-filters";
import { ProductTable } from "@/features/products/components/product-table";
import { PAGE_SIZE } from "@/features/products/list";
import { productListQuerySchema } from "@/features/products/schemas";
import { listProducts } from "@/features/products/service";
import { requireAdmin } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Produits" };

export default async function ProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const session = await requireAdmin();
  const query = productListQuerySchema.parse(await searchParams);
  const [result, categories] = await Promise.all([
    listProducts(query),
    listActiveCategories(),
  ]);

  const canWrite = can(session.role, "products:write");
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const hasFilters =
    query.q !== "" || query.category !== undefined || query.stock !== undefined;

  const addButton = canWrite ? (
    <Button asChild>
      <Link href="/admin/products/new">
        <PlusIcon aria-hidden />
        Ajouter un produit
      </Link>
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Produits"
        description="Catalogue, prix et niveaux de stock."
        actions={addButton}
      />

      <ProductFilters
        query={query}
        categories={categories.map(({ id, name }) => ({ id, name }))}
      />

      {result.total > 0 ? (
        <>
          <ProductTable
            products={result.items}
            categoryNames={categoryNames}
            canWrite={canWrite}
          />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            pageSize={PAGE_SIZE}
          />
        </>
      ) : hasFilters ? (
        <EmptyState
          icon={SearchXIcon}
          title="Aucun produit ne correspond à vos filtres."
          description="Essayez un autre mot-clé ou retirez un filtre."
          action={
            <Button asChild variant="outline">
              <Link
                href={
                  query.status === "current"
                    ? "/admin/products"
                    : `/admin/products?status=${query.status}`
                }
              >
                Réinitialiser les filtres
              </Link>
            </Button>
          }
        />
      ) : query.status === "current" ? (
        <EmptyState
          icon={PackageIcon}
          title="Aucun produit n'a encore été ajouté."
          description="Les produits créés ici apparaissent dans la boutique une fois publiés."
          action={addButton}
        />
      ) : (
        <EmptyState
          icon={PackageIcon}
          title="Aucun produit dans cette catégorie de statut."
        />
      )}
    </>
  );
}
