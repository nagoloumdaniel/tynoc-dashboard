// Pure: what each event says. The services decide when to record it.
import { type StockLevel, stockLevel } from "@/features/products/stock";
import { USER_ROLE_LABELS, type UserRole } from "@/features/users/types";
import { maskEmail } from "@/lib/format";

export const NOTIFICATION_TYPES = [
  "STOCK_LOW",
  "STOCK_OUT",
  "PRODUCT_DELETED",
  "USER_ANONYMIZED",
  "ROLE_CHANGED",
  "ADMIN_CREATED",
  "LOGIN_BLOCKED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSeverity = "info" | "important";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  severity: NotificationSeverity;
  /** Set for actions by an admin: they do not get their own notification. */
  actorId?: string;
};

type Actor = { userId: string; email: string };

const SEVERITY_RANK: Record<StockLevel, number> = { IN: 0, LOW: 1, OUT: 2 };

/** Only when the stock level gets worse, for products still on offer. */
export function stockNotification(
  before: { stock: number; lowStockThreshold: number },
  after: {
    id: string;
    name: string;
    stock: number;
    lowStockThreshold: number;
    status: string;
  },
): NotificationInput | null {
  if (after.status === "ARCHIVED") return null;
  const from = stockLevel(before);
  const to = stockLevel(after);
  if (SEVERITY_RANK[to] <= SEVERITY_RANK[from]) return null;
  const href = `/admin/products/${after.id}`;
  return to === "OUT"
    ? {
        type: "STOCK_OUT",
        severity: "important",
        title: "Rupture de stock",
        body: `« ${after.name} » n'a plus de stock.`,
        href,
      }
    : {
        type: "STOCK_LOW",
        severity: "info",
        title: "Stock faible",
        body: `« ${after.name} » : ${after.stock} unité(s) restante(s) (seuil ${after.lowStockThreshold}).`,
        href,
      };
}

export function productDeleted(
  actor: Actor,
  product: { name: string; sku: string },
): NotificationInput {
  return {
    type: "PRODUCT_DELETED",
    severity: "info",
    title: "Produit supprimé",
    body: `« ${product.name} » (${product.sku}) supprimé définitivement par ${actor.email}.`,
    href: "/admin/activity?entity=PRODUCT&action=DELETE",
    actorId: actor.userId,
  };
}

export function userAnonymized(
  actor: Actor,
  user: { id: string },
): NotificationInput {
  return {
    type: "USER_ANONYMIZED",
    severity: "info",
    title: "Compte anonymisé",
    body: `Un compte a été anonymisé (RGPD) par ${actor.email}.`,
    href: `/admin/users/${user.id}`,
    actorId: actor.userId,
  };
}

export function roleChanged(
  actor: Actor,
  user: { id: string; name: string },
  from: UserRole,
  to: UserRole,
): NotificationInput {
  return {
    type: "ROLE_CHANGED",
    severity: "important",
    title: "Rôle modifié",
    body: `${user.name} : ${USER_ROLE_LABELS[from]} → ${USER_ROLE_LABELS[to]}, par ${actor.email}.`,
    href: `/admin/users/${user.id}`,
    actorId: actor.userId,
  };
}

export function adminCreated(
  actor: Actor,
  user: { id: string; name: string; role: UserRole },
): NotificationInput {
  return {
    type: "ADMIN_CREATED",
    severity: "important",
    title: "Nouvel administrateur",
    body: `${user.name} (${USER_ROLE_LABELS[user.role]}) créé par ${actor.email}.`,
    href: `/admin/users/${user.id}`,
    actorId: actor.userId,
  };
}

/** The email may be anything an attacker typed: it is shown masked. */
export function loginBlocked(email: string): NotificationInput {
  return {
    type: "LOGIN_BLOCKED",
    severity: "important",
    title: "Connexion bloquée",
    body: `5 échecs de connexion pour ${maskEmail(email)} : accès bloqué 15 minutes.`,
    href: "/admin/users?type=admins",
  };
}
