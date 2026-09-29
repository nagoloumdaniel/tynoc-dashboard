/** Parent id of top-level categories, so they can be queried by index. */
export const ROOT_PARENT = "ROOT";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  /** ROOT_PARENT for a top-level category, else the id of a top-level one. */
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  /** Missing on categories created before phase 4: read as 1. */
  version?: number;
  createdAt: string;
  updatedAt: string;
};

export const isRoot = (category: Pick<Category, "parentId">) =>
  category.parentId === ROOT_PARENT;

export const SEED_CATEGORIES = [
  { name: "Mobilier", slug: "mobilier" },
  { name: "Luminaires", slug: "luminaires" },
  { name: "Décoration", slug: "decoration" },
  { name: "Textile", slug: "textile" },
  { name: "Cuisine", slug: "cuisine" },
  { name: "Rangement", slug: "rangement" },
] as const;
