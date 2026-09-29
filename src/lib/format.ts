const euros = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatPrice(cents: number): string {
  return euros.format(cents / 100);
}

/**
 * Parses what an admin types in a price field ("24,99", "24.99", "1 299,5")
 * into integer cents. Returns null for anything that is not a positive amount
 * with at most two decimals.
 */
export function parseEuros(text: string): number | null {
  const compact = text.replace(/[\s  ]/g, "").replace(",", ".");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(compact);
  if (!match) return null;
  const [, units = "0", decimals = ""] = match;
  return Number(units) * 100 + Number(decimals.padEnd(2, "0"));
}

export function centsToEuroInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Lowercase without accents, for search and sorting. */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function slugify(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
