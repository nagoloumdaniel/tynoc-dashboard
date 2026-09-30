import { z } from "zod";
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "@/lib/audit/actions";
import { parsePeriod } from "@/features/dashboard/period";

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const activityQuerySchema = z.object({
  // parsePeriod turns anything (missing included) into 7, 30 or 90.
  period: z.preprocess(
    parsePeriod,
    z.union([z.literal(7), z.literal(30), z.literal(90)]),
  ),
  entity: z
    .preprocess(firstValue, z.enum(AUDIT_ENTITY_TYPES).optional())
    .catch(undefined),
  action: z
    .preprocess(firstValue, z.enum(AUDIT_ACTIONS).optional())
    .catch(undefined),
  actor: z
    .preprocess(
      firstValue,
      z.string().trim().toLowerCase().pipe(z.email()).optional(),
    )
    .catch(undefined),
});

export type ActivityQuery = z.output<typeof activityQuerySchema>;
