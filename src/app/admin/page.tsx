import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <SectionPlaceholder
      title="Tableau de bord"
      description="Vue d'ensemble du catalogue, des clients et de l'activité."
      phase={7}
    />
  );
}
