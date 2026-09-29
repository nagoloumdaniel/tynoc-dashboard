import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import {
  listCategoryLabels,
  listUsableCategoryOptions,
} from "@/features/categories/service";
import { ProductForm } from "@/features/products/components/product-form";
import { getProduct } from "@/features/products/service";
import { requireAdmin } from "@/lib/auth/dal";
import { centsToEuroInput } from "@/lib/format";

export const metadata: Metadata = { title: "Modifier le produit" };

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[productId]/edit">) {
  await requireAdmin("products:write");
  const { productId } = await params;
  const [product, usable, labels] = await Promise.all([
    getProduct(productId),
    listUsableCategoryOptions(),
    listCategoryLabels(),
  ]);
  if (!product) notFound();

  // A deactivated current category stays selectable: saving other fields
  // must not force a new category.
  const categories = usable.some((c) => c.id === product.categoryId)
    ? usable
    : [
        {
          id: product.categoryId,
          label: `${labels.get(product.categoryId) ?? "Catégorie supprimée"} (inactive)`,
        },
        ...usable,
      ];

  if (product.status === "ARCHIVED") {
    return (
      <>
        <PageHeader title={`Modifier « ${product.name} »`} />
        <p className="rounded-lg border bg-surface p-5 text-sm">
          Ce produit est archivé. Restaurez-le depuis sa fiche avant de le
          modifier.
        </p>
        <Button asChild variant="outline">
          <Link href={`/admin/products/${product.id}`}>Retour à la fiche</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader title={`Modifier « ${product.name} »`} />
      <ProductForm
        mode="edit"
        categories={categories}
        product={{
          id: product.id,
          version: product.version,
          stock: product.stock,
        }}
        initial={{
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          description: product.description ?? "",
          categoryId: product.categoryId,
          price: centsToEuroInput(product.priceInCents),
          salePrice:
            product.salePriceInCents === undefined
              ? ""
              : centsToEuroInput(product.salePriceInCents),
          stock: String(product.stock),
          lowStockThreshold: String(product.lowStockThreshold),
          status: product.status,
        }}
      />
    </>
  );
}
