// Pure definitions shared by the server (audit writes) and the UI (filters).

export const AUDIT_ACTION_LABELS = {
  LOGIN: "Connexion",
  LOGOUT: "Déconnexion",
  CREATE: "Création",
  UPDATE: "Modification",
  ARCHIVE: "Archivage",
  RESTORE: "Restauration",
  ACTIVATE: "Activation",
  DEACTIVATE: "Désactivation",
  REACTIVATE: "Réactivation",
  SUSPEND: "Suspension",
  PASSWORD_RESET: "Mot de passe réinitialisé",
  PASSWORD_CHANGE: "Mot de passe changé",
  ANONYMIZE: "Anonymisation",
  REMOVE_ITEM: "Article retiré",
  EMPTY: "Vidage",
  DELETE: "Suppression",
  STOCK_ADJUST: "Ajustement de stock",
  ROLE_CHANGE: "Changement de rôle",
} as const;

export type AuditAction = keyof typeof AUDIT_ACTION_LABELS;
export const AUDIT_ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

export const AUDIT_ENTITY_LABELS = {
  PRODUCT: "Produit",
  CATEGORY: "Catégorie",
  USER: "Utilisateur",
  CART: "Panier",
  WISHLIST: "Wishlist",
} as const;

export type AuditEntityType = keyof typeof AUDIT_ENTITY_LABELS;
export const AUDIT_ENTITY_TYPES = Object.keys(
  AUDIT_ENTITY_LABELS,
) as AuditEntityType[];

/** Admin page of the object an entry is about. */
export function auditEntityHref(type: AuditEntityType, id: string): string {
  const base = {
    PRODUCT: "/admin/products",
    CATEGORY: "/admin/categories",
    USER: "/admin/users",
    CART: "/admin/carts",
    WISHLIST: "/admin/wishlists",
  }[type];
  // Categories have no detail page: the list is the place to act on them.
  return type === "CATEGORY" ? base : `${base}/${id}`;
}
