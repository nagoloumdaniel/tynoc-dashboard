export type StockLevel = "IN" | "LOW" | "OUT";

export const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  IN: "En stock",
  LOW: "Stock faible",
  OUT: "Rupture",
};

export function stockLevel(product: {
  stock: number;
  lowStockThreshold: number;
}): StockLevel {
  if (product.stock <= 0) return "OUT";
  if (product.stock <= product.lowStockThreshold) return "LOW";
  return "IN";
}
