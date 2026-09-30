import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/features/auth/actions";
import { PasswordChangeForm } from "@/features/auth/components/password-change-form";
import { getSession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Mot de passe" };

// Outside the admin layout: it must stay reachable while the password
// still has to be changed (requireAdmin redirects here).
export default async function PasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const forced = session.mustChangePassword === true;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {forced ? null : (
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
            Tableau de bord
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">
          {forced
            ? "Choisissez votre mot de passe"
            : "Changer mon mot de passe"}
        </h1>
        <p className="mt-1 mb-8 text-sm text-muted-foreground">
          {forced
            ? `Bonjour ${session.name}, votre compte a été créé avec un mot de passe temporaire. Remplacez-le pour accéder à l'administration.`
            : "Vos autres sessions ouvertes seront fermées."}
        </p>
        <PasswordChangeForm forced={forced} />
        {forced ? (
          <form action={logout} className="mt-6 text-center">
            <button
              type="submit"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Se déconnecter
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
