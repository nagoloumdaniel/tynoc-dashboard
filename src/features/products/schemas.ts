import { z } from "zod";
import { parseEuros } from "@/lib/format";

const INVALID_AMOUNT = "Montant invalide (exemple : 24,99).";

const euroAmount = z.string().transform((value, ctx) => {
  const cents = parseEuros(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: INVALID_AMOUNT });
    return z.NEVER;
  }
  return cents;
});

const optionalEuroAmount = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value?.trim()) return undefined;
    const cents = parseEuros(value);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: INVALID_AMOUNT });
      return z.NEVER;
    }
    return cents;
  });

const wholeNumber = (max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, "Nombre entier positif attendu.")
    .transform(Number)
    .pipe(z.number().max(max, "Valeur trop grande."));

const productFields = {
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir entre 2 et 120 caractères.")
    .max(120, "Le nom doit contenir entre 2 et 120 caractères."),
  slug: z
    .string()
    .trim()
    .min(2, "Le slug doit contenir entre 2 et 120 caractères.")
    .max(120, "Le slug doit contenir entre 2 et 120 caractères.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Minuscules, chiffres et tirets uniquement.",
    ),
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]{2,50}$/,
      "2 à 50 caractères : lettres, chiffres et tirets.",
    ),
  description: z
    .string()
    .trim()
    .max(5000, "5 000 caractères maximum.")
    .optional()
    .transform((value) => value || undefined),
  categoryId: z.string().min(1, "Choisissez une catégorie."),
  price: euroAmount,
  salePrice: optionalEuroAmount,
  lowStockThreshold: wholeNumber(100_000),
  status: z.enum(["DRAFT", "ACTIVE"], { error: "Statut invalide." }),
};

type WithPrices = { price: number; salePrice?: number };

function salePriceBelowPrice(data: WithPrices) {
  return data.salePrice === undefined || data.salePrice < data.price;
}

const salePriceRule = {
  message: "Le prix promotionnel doit être inférieur au prix.",
  path: ["salePrice"],
};

function toCents<T extends WithPrices>({ price, salePrice, ...rest }: T) {
  return { ...rest, priceInCents: price, salePriceInCents: salePrice };
}

export const productCreateSchema = z
  .object({ ...productFields, stock: wholeNumber(1_000_000) })
  .refine(salePriceBelowPrice, salePriceRule)
  .transform(toCents);

/** Stock is not editable here: it changes through audited adjustments. */
export const productUpdateSchema = z
  .object(productFields)
  .refine(salePriceBelowPrice, salePriceRule)
  .transform(toCents);

export type ProductCreateInput = z.output<typeof productCreateSchema>;
export type ProductUpdateInput = z.output<typeof productUpdateSchema>;

export const STOCK_REASONS = [
  "RESTOCK",
  "INVENTORY",
  "DAMAGE",
  "CORRECTION",
  "OTHER",
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export const STOCK_REASON_LABELS: Record<StockReason, string> = {
  RESTOCK: "Réapprovisionnement",
  INVENTORY: "Inventaire",
  DAMAGE: "Casse ou perte",
  CORRECTION: "Correction d'erreur",
  OTHER: "Autre",
};

export const stockAdjustmentSchema = z
  .object({
    mode: z.enum(["DELTA", "SET"], { error: "Mode invalide." }),
    quantity: z
      .string()
      .trim()
      .regex(/^-?\d+$/, "Nombre entier attendu.")
      .transform(Number)
      .pipe(
        z
          .number()
          .min(-1_000_000, "Valeur trop grande.")
          .max(1_000_000, "Valeur trop grande."),
      ),
    reason: z.enum(STOCK_REASONS, { error: "Choisissez une raison." }),
    note: z
      .string()
      .trim()
      .max(200, "200 caractères maximum.")
      .optional()
      .transform((value) => value || undefined),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "DELTA" && data.quantity === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Indiquez une variation différente de zéro.",
        path: ["quantity"],
      });
    }
    if (data.mode === "SET" && data.quantity < 0) {
      ctx.addIssue({
        code: "custom",
        message: "Le stock ne peut pas être négatif.",
        path: ["quantity"],
      });
    }
  });

// The transform yields `note: string | undefined`; callers may simply omit it.
export type StockAdjustment = Omit<
  z.output<typeof stockAdjustmentSchema>,
  "note"
> & { note?: string };

export const PRODUCT_SORTS = [
  "name",
  "-name",
  "price",
  "-price",
  "stock",
  "-stock",
  "createdAt",
  "-createdAt",
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const LIST_STATUSES = [
  "current",
  "ACTIVE",
  "DRAFT",
  "ARCHIVED",
] as const;
export type ListStatus = (typeof LIST_STATUSES)[number];

// URL params may be repeated (?q=a&q=b): keep the first one.
const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

/** Every invalid URL param silently falls back to its default. */
export const productListQuerySchema = z.object({
  q: z.preprocess(firstValue, z.string().trim().max(100)).catch(""),
  category: z
    .preprocess(
      firstValue,
      z
        .string()
        .regex(/^cat_[a-z0-9-]+$/)
        .optional(),
    )
    .catch(undefined),
  status: z.preprocess(firstValue, z.enum(LIST_STATUSES)).catch("current"),
  stock: z
    .preprocess(firstValue, z.enum(["in", "low", "out"]).optional())
    .catch(undefined),
  sort: z.preprocess(firstValue, z.enum(PRODUCT_SORTS)).catch("-createdAt"),
  page: z
    .preprocess(firstValue, z.coerce.number().int().min(1).max(10_000))
    .catch(1),
});

export type ProductListQuery = z.output<typeof productListQuerySchema>;
