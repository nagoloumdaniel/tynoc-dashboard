export const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type Product = {
  id: string;
  name: string;
  /** Lowercase without accents: sort key of the byStatus index and search. */
  nameNormalized: string;
  slug: string;
  sku: string;
  description?: string;
  categoryId: string;
  priceInCents: number;
  salePriceInCents?: number;
  stock: number;
  lowStockThreshold: number;
  imageKeys: string[];
  status: ProductStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
};

/** Fields read for the list page (DynamoDB projection). */
export const LIST_FIELDS = [
  "id",
  "name",
  "nameNormalized",
  "sku",
  "categoryId",
  "priceInCents",
  "salePriceInCents",
  "stock",
  "lowStockThreshold",
  "status",
  "createdAt",
  "version",
] as const;

export type ProductListItem = Pick<Product, (typeof LIST_FIELDS)[number]>;

export const STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  ARCHIVED: "Archivé",
};
