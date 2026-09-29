import { z } from "zod";
import { ROOT_PARENT } from "./types";

const NAME_LENGTH = "Le nom doit contenir entre 2 et 60 caractères.";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, NAME_LENGTH).max(60, NAME_LENGTH),
  slug: z
    .string()
    .trim()
    .min(2, "Le slug doit contenir entre 2 et 60 caractères.")
    .max(60, "Le slug doit contenir entre 2 et 60 caractères.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Minuscules, chiffres et tirets uniquement.",
    ),
  description: z
    .string()
    .trim()
    .max(500, "500 caractères maximum.")
    .optional()
    .transform((value) => value || undefined),
  parentId: z
    .string()
    .trim()
    .transform((value) => value || ROOT_PARENT),
  sortOrder: z
    .string()
    .trim()
    .regex(/^\d+$/, "Nombre entier positif attendu.")
    .transform(Number)
    .pipe(z.number().max(9999, "Valeur trop grande.")),
  // An unchecked checkbox is simply absent from the form data.
  isActive: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
});

export type CategoryInput = z.output<typeof categoryFormSchema>;
