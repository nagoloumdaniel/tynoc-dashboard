import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Wishlists" };

export default function WishlistsPage() {
  return (
    <SectionPlaceholder
      title="Wishlists"
      description="Produits sauvegardés par les clients."
      phase={6}
    />
  );
}
