import { Badge, type BadgeTone } from "@/components/ui/badge";
import { STOCK_LEVEL_LABELS, type StockLevel, stockLevel } from "../stock";
import { type ProductStatus, STATUS_LABELS } from "../types";

const STATUS_TONES: Record<ProductStatus, BadgeTone> = {
  ACTIVE: "success",
  DRAFT: "neutral",
  ARCHIVED: "warning",
};

const STOCK_TONES: Record<StockLevel, BadgeTone> = {
  IN: "success",
  LOW: "warning",
  OUT: "danger",
};

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>;
}

/** Quantity plus level in words: the colour is never the only signal. */
export function StockBadge({
  stock,
  lowStockThreshold,
}: {
  stock: number;
  lowStockThreshold: number;
}) {
  const level = stockLevel({ stock, lowStockThreshold });
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-medium tabular-nums">{stock}</span>
      <Badge tone={STOCK_TONES[level]}>{STOCK_LEVEL_LABELS[level]}</Badge>
    </span>
  );
}
