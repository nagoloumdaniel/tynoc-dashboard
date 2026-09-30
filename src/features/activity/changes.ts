import { STOCK_REASON_LABELS } from "@/features/products/schemas";
import { STATUS_LABELS } from "@/features/products/types";
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/features/users/types";
import { formatPrice } from "@/lib/format";

const FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  slug: "Slug",
  sku: "SKU",
  description: "Description",
  categoryId: "Catégorie",
  parentId: "Catégorie parente",
  priceInCents: "Prix",
  salePriceInCents: "Prix promotionnel",
  lowStockThreshold: "Seuil de stock faible",
  status: "Statut",
  stock: "Stock",
  images: "Images",
  reason: "Raison",
  sortOrder: "Ordre",
  isActive: "Active",
  email: "Email",
  phone: "Téléphone",
  role: "Rôle",
};

// Codes stored in the log, per field; unknown codes are shown as stored.
const CODE_LABELS: Record<string, Record<string, string>> = {
  role: USER_ROLE_LABELS,
  reason: STOCK_REASON_LABELS,
  status: { ...USER_STATUS_LABELS, ...STATUS_LABELS },
};

const MAX_LENGTH = 120;
const clip = (text: string) =>
  text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;

export function formatChangeValue(field: string, value: unknown): string {
  // Not a dash: "— → Administrateur" reads as punctuation.
  if (value === null || value === undefined || value === "") return "(vide)";
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (typeof value === "number" && field.endsWith("InCents")) {
    return formatPrice(value);
  }
  if (typeof value === "string" || typeof value === "number") {
    return clip(CODE_LABELS[field]?.[String(value)] ?? String(value));
  }
  return clip(JSON.stringify(value));
}

export type ChangeLine = {
  field: string;
  label: string;
  from: string;
  to: string;
};

export function describeChanges(
  changes: Record<string, { from: unknown; to: unknown }> | undefined,
): ChangeLine[] {
  return Object.entries(changes ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field, { from, to }]) => ({
      field,
      label: FIELD_LABELS[field] ?? field,
      from: formatChangeValue(field, from),
      to: formatChangeValue(field, to),
    }));
}
