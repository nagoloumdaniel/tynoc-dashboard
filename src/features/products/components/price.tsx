import { formatPrice } from "@/lib/format";

export function Price({
  priceInCents,
  salePriceInCents,
}: {
  priceInCents: number;
  salePriceInCents?: number;
}) {
  if (salePriceInCents === undefined) {
    return <span className="tabular-nums">{formatPrice(priceInCents)}</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 tabular-nums">
      <span className="font-medium text-danger">
        <span className="sr-only">Prix promotionnel : </span>
        {formatPrice(salePriceInCents)}
      </span>
      <s className="text-xs text-muted-foreground">
        <span className="sr-only">au lieu de </span>
        {formatPrice(priceInCents)}
      </s>
    </span>
  );
}
