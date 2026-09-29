import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Paramètres" };

export default function SettingsPage() {
  return (
    <SectionPlaceholder
      title="Paramètres"
      description="Préférences du compte et de l'administration."
      phase={8}
    />
  );
}
