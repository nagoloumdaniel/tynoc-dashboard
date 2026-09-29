import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { listActiveCategories } from "@/features/categories/repository";
import { ProductForm } from "@/features/products/components/product-form";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  await requireAdmin("products:write");
  const categories = await listActiveCategories();

  return (
    <>
      <PageHeader
        title="Nouveau produit"
        description="Enregistrez-le en brouillon pour le compléter avant de le publier."
      />
      <ProductForm
        mode="create"
        categories={categories.map(({ id, name }) => ({ id, name }))}
        initial={{
          name: "",
          slug: "",
          sku: "",
          description: "",
          categoryId: "",
          price: "",
          salePrice: "",
          stock: "0",
          lowStockThreshold: "5",
          status: "DRAFT",
        }}
      />
    </>
  );
}
