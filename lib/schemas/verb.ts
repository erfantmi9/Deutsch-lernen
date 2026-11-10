import { z } from "zod";
import type { VerbEntry } from "../../types/verb";
import { I18n2Schema, I18n3Schema, LevelSchema, TextSchema } from "./common";

export const ConjugationSchema = z.object({
  ich: TextSchema,
  du: TextSchema,
  er_sie_es: TextSchema,
  wir: TextSchema,
  ihr: TextSchema,
  sie_Sie: TextSchema,
});

export const VerbEntrySchema = z.object({
  id: TextSchema,
  infinitive: TextSchema,
  level: LevelSchema,
  category: z.enum(["basic", "daily", "movement", "communication", "modal"]),
  usage: z.enum(["essential", "common", "useful"]),
  translations: I18n2Schema,
  type: z.enum(["regular", "irregular", "modal", "separable", "reflexive"]),
  stemChange: TextSchema.optional(),
  separable: z.object({ prefix: TextSchema, stem: TextSchema }).optional(),
  present: ConjugationSchema,
  perfekt: z.object({
    auxiliary: z.enum(["haben", "sein"]),
    partizip2: TextSchema,
  }),
  praeteritum: ConjugationSchema.optional(),
  example: I18n3Schema,
  note: I18n3Schema.optional(),
}) satisfies z.ZodType<VerbEntry>;

export const VerbListSchema = z.array(VerbEntrySchema).min(1);
