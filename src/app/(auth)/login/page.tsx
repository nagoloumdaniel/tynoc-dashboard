import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { getSession } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/auth/safe-redirect";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const next = typeof params.next === "string" ? params.next : undefined;
  if (session) redirect(safeNextPath(next));

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[26rem] shrink-0 flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 text-sidebar-active-foreground">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-md bg-primary font-semibold text-white"
          >
            T
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Tynoc Admin
          </span>
        </div>
        <p className="max-w-xs text-2xl leading-snug font-medium text-sidebar-active-foreground">
          Catalogue, stocks et clients de la boutique, au même endroit.
        </p>
        <p className="text-sm text-sidebar-muted">
          Accès réservé à l&apos;équipe Tynoc.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-md bg-primary font-semibold text-white"
            >
              T
            </span>
            <span className="text-lg font-semibold tracking-tight">
              Tynoc Admin
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Connexion à l&apos;administration
          </h1>
          <p className="mt-1 mb-8 text-sm text-muted-foreground">
            Utilisez l&apos;email et le mot de passe de votre compte
            administrateur.
          </p>
          <LoginForm next={next} />
        </div>
      </main>
    </div>
  );
}
