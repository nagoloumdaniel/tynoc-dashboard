import type { ProductStatus } from "@/features/products/types";

export type CartLine = {
  userId: string;
  productId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
};

export type WishlistLine = {
  userId: string;
  productId: string;
  addedAt: string;
};

/** Product fields needed to show and price a cart line. */
export type ProductSnapshot = {
  id: string;
  name: string;
  sku: string;
  priceInCents: number;
  salePriceInCents?: number;
  stock: number;
  status: ProductStatus;
};

export type Availability =
  "OK" | "INSUFFICIENT" | "OUT" | "ARCHIVED" | "DELETED";

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  OK: "Disponible",
  INSUFFICIENT: "Stock insuffisant",
  OUT: "Rupture",
  ARCHIVED: "Produit archivé",
  DELETED: "Produit supprimé",
};

export type CustomerInfo = { name: string; email: string } | null;

export type CartSummary = {
  userId: string;
  lines: number;
  quantity: number;
  valueInCents: number;
  updatedAt: string;
  abandoned: boolean;
  unavailableLines: number;
};

export type WishlistSummary = {
  userId: string;
  count: number;
  lastAddedAt: string;
};
