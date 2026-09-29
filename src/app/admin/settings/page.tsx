import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  // Settings change how the admin works: read-only accounts get a 403.
  await requireAdmin("users:write");

  return (
    <SectionPlaceholder
      title="Paramètres"
      description="Préférences du compte et de l'administration."
      phase={8}
    />
  );
}
