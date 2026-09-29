/** Parent id of top-level categories, so they can be queried by index. */
export const ROOT_PARENT = "ROOT";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const SEED_CATEGORIES = [
  { name: "Mobilier", slug: "mobilier" },
  { name: "Luminaires", slug: "luminaires" },
  { name: "Décoration", slug: "decoration" },
  { name: "Textile", slug: "textile" },
  { name: "Cuisine", slug: "cuisine" },
  { name: "Rangement", slug: "rangement" },
] as const;
