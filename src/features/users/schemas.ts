import { z } from "zod";
import { ADMIN_ROLES } from "@/lib/auth/permissions";
import { USER_ROLES } from "./types";

const NAME_LENGTH = "Le nom doit contenir entre 2 et 80 caractères.";
const INVALID_EMAIL = "Saisissez une adresse email valide.";

const name = z.string().trim().min(2, NAME_LENGTH).max(80, NAME_LENGTH);
const email = z
  .string({ error: INVALID_EMAIL })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: INVALID_EMAIL }));

export const userUpdateSchema = z.object({
  name,
  email,
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(
      z
        .string()
        .regex(/^[+0-9 ().-]{6,20}$/, "Numéro de téléphone invalide.")
        .optional(),
    ),
});
export type UserUpdateInput = z.output<typeof userUpdateSchema>;

export const adminCreateSchema = z.object({
  name,
  email,
  role: z.enum(ADMIN_ROLES, { error: "Choisissez un rôle." }),
});
export type AdminCreateInput = z.output<typeof adminCreateSchema>;

export const roleChangeSchema = z.object({
  role: z.enum(USER_ROLES, { error: "Choisissez un rôle." }),
});

export const passwordChangeSchema = z
  .object({
    current: z.string().min(1, "Saisissez votre mot de passe actuel."),
    next: z
      .string()
      .min(12, "12 caractères minimum.")
      .max(200, "200 caractères maximum."),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.next !== data.confirm) {
      ctx.addIssue({
        code: "custom",
        message: "Les deux mots de passe ne correspondent pas.",
        path: ["confirm"],
      });
    }
    if (data.next === data.current) {
      ctx.addIssue({
        code: "custom",
        message: "Choisissez un mot de passe différent de l'actuel.",
        path: ["next"],
      });
    }
  });

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const USER_LIST_STATUSES = [
  "current",
  "ACTIVE",
  "SUSPENDED",
  "DELETED",
] as const;
export const USER_SORTS = ["-createdAt", "createdAt", "name"] as const;

export const userListQuerySchema = z.object({
  q: z.preprocess(firstValue, z.string().trim().max(100)).catch(""),
  type: z
    .preprocess(firstValue, z.enum(["all", "customers", "admins"]))
    .catch("all"),
  status: z.preprocess(firstValue, z.enum(USER_LIST_STATUSES)).catch("current"),
  sort: z.preprocess(firstValue, z.enum(USER_SORTS)).catch("-createdAt"),
  page: z
    .preprocess(firstValue, z.coerce.number().int().min(1).max(10_000))
    .catch(1),
});
export type UserListQuery = z.output<typeof userListQuerySchema>;
