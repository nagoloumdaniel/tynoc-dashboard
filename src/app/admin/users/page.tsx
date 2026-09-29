import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Utilisateurs" };

export default function UsersPage() {
  return (
    <SectionPlaceholder
      title="Utilisateurs"
      description="Comptes clients et administrateurs, rôles et statuts."
      phase={5}
    />
  );
}
