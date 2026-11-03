import { z } from "zod";
import type { VocabEntry } from "../../types/vocab";
import { I18n2Schema, I18n3Schema, LevelSchema, TextSchema } from "./common";

export const ArticleSchema = z.enum(["der", "die", "das"]);
export const VocabCategorySchema = z.enum([
  "food",
  "family",
  "home",
  "travel",
  "time",
  "school",
  "body",
  "shopping",
  "jobs",
  "weather",
  "colors",
  "clothes",
  "city",
  "hobbies",
  "numbers-time",
]);

export const VocabEntrySchema = z.object({
  id: TextSchema,
  word: TextSchema,
  article: ArticleSchema,
  plural: TextSchema,
  translations: I18n2Schema,
  grammarRule: I18n3Schema.extend({ simple: I18n3Schema }),
  ruleCategory: z.enum(["suffix", "semantic", "exception", "learn"]),
  example: I18n3Schema,
  category: VocabCategorySchema,
  level: LevelSchema,
  tags: z.array(TextSchema).optional(),
}) satisfies z.ZodType<VocabEntry>;

export const VocabListSchema = z
  .array(VocabEntrySchema)
  .min(1)
  .refine((list) => new Set(list.map((w) => w.id)).size === list.length, {
    message: "Duplicate vocab ids",
  });
