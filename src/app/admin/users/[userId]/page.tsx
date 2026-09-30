import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Avatar,
  RoleBadge,
  UserStatusBadge,
} from "@/features/users/components/badges";
import { UserActions } from "@/features/users/components/user-actions";
import { canManageUser, type UserAction } from "@/features/users/policy";
import { getUserDetail } from "@/features/users/service";
import { requireAdmin } from "@/lib/auth/dal";
import { maskEmail } from "@/lib/format";

export const metadata: Metadata = { title: "Compte utilisateur" };

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Création",
  UPDATE: "Modification",
  SUSPEND: "Suspension",
  REACTIVATE: "Réactivation",
  ROLE_CHANGE: "Rôle",
  PASSWORD_RESET: "Mot de passe",
  PASSWORD_CHANGE: "Mot de passe",
  ANONYMIZE: "Anonymisation",
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
};

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});
const formatDate = (iso?: string) =>
  iso ? dateTime.format(new Date(iso)) : "—";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right break-all">{children}</dd>
    </div>
  );
}

const ACTIONS: UserAction[] = [
  "edit",
  "suspend",
  "reactivate",
  "changeRole",
  "resetPassword",
  "anonymize",
];

export default async function UserPage({
  params,
}: PageProps<"/admin/users/[userId]">) {
  const session = await requireAdmin();
  const { userId } = await params;
  const detail = await getUserDetail(userId);
  if (!detail) notFound();
  const { user, cartItems, wishlistItems, activity } = detail;

  const email = session.role === "VIEWER" ? maskEmail(user.email) : user.email;
  const allowed =
    user.status === "DELETED"
      ? {}
      : Object.fromEntries(
          ACTIONS.map((action) => [
            action,
            canManageUser(session, user, action).ok,
          ]),
        );

  return (
    <>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        Utilisateurs
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <RoleBadge role={user.role} />
              <UserStatusBadge status={user.status} />
            </div>
          </div>
        </div>
        <UserActions
          user={{
            id: user.id,
            version: user.version,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            status: user.status,
          }}
          allowed={allowed}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold">Informations</h2>
            <dl className="divide-y">
              <Row label="Email">{email}</Row>
              <Row label="Téléphone">{user.phone ?? "—"}</Row>
              <Row label="Inscription">{formatDate(user.createdAt)}</Row>
              <Row label="Dernière connexion">
                {formatDate(user.lastLoginAt)}
              </Row>
              {user.anonymizedAt ? (
                <Row label="Anonymisé le">{formatDate(user.anonymizedAt)}</Row>
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border bg-surface p-5">
            <h2 className="mb-4 text-base font-semibold">Historique</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune action.</p>
            ) : (
              <ol className="space-y-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <span className="w-28 shrink-0 font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate">{entry.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorEmail} · {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section className="h-fit rounded-lg border bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold">Activité boutique</h2>
          <dl className="divide-y">
            <Row label="Articles dans le panier">
              <Link
                href={`/admin/carts/${user.id}`}
                className="hover:underline"
              >
                {cartItems} · voir
              </Link>
            </Row>
            <Row label="Produits en wishlist">
              <Link
                href={`/admin/wishlists/${user.id}`}
                className="hover:underline"
              >
                {wishlistItems} · voir
              </Link>
            </Row>
          </dl>
        </section>
      </div>
    </>
  );
}
