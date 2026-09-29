import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Activité" };

export default function ActivityPage() {
  return (
    <SectionPlaceholder
      title="Activité"
      description="Historique des actions effectuées par les administrateurs."
      phase={7}
    />
  );
}
