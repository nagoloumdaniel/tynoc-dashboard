import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ error: "Saisissez une adresse email valide." })
    .trim()
    .pipe(z.email({ error: "Saisissez une adresse email valide." })),
  password: z
    .string({ error: "Saisissez votre mot de passe." })
    .min(1, { error: "Saisissez votre mot de passe." })
    .max(200, { error: "Mot de passe trop long." }),
});

export type LoginInput = z.infer<typeof loginSchema>;
