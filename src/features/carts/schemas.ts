import { z } from "zod";

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

const q = z.preprocess(firstValue, z.string().trim().max(100)).catch("");
const page = z
  .preprocess(firstValue, z.coerce.number().int().min(1).max(10_000))
  .catch(1);

export const cartListQuerySchema = z.object({
  q,
  /** "1": abandoned carts only. */
  abandoned: z
    .preprocess(firstValue, z.enum(["1"]).optional())
    .catch(undefined),
  /** Carts containing this product. */
  product: z
    .preprocess(
      firstValue,
      z
        .string()
        .regex(/^prd_[\w-]+$/)
        .optional(),
    )
    .catch(undefined),
  sort: z
    .preprocess(firstValue, z.enum(["-updatedAt", "updatedAt", "-value"]))
    .catch("-updatedAt"),
  page,
});
export type CartListQuery = z.output<typeof cartListQuerySchema>;

export const wishlistListQuerySchema = z.object({
  q,
  sort: z
    .preprocess(firstValue, z.enum(["-addedAt", "-count"]))
    .catch("-addedAt"),
  page,
});
export type WishlistListQuery = z.output<typeof wishlistListQuerySchema>;
