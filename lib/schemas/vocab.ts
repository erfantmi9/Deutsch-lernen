import { z } from "zod";
import { VOCAB_CATEGORIES, VOCAB_SUBCATEGORIES } from "../../types/vocab";
import type { VocabEntry } from "../../types/vocab";
import { I18n2Schema, I18n3Schema, LevelSchema, TextSchema } from "./common";

export const ArticleSchema = z.enum(["der", "die", "das"]);
export const VocabCategorySchema = z.enum(VOCAB_CATEGORIES);

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
  subcategory: TextSchema.optional(),
  level: LevelSchema,
  tags: z.array(TextSchema).optional(),
})
  .superRefine((e, ctx) => {
    const subs = VOCAB_SUBCATEGORIES[e.category];
    if (subs && (e.subcategory === undefined || !subs.includes(e.subcategory))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcategory"],
        message: `category "${e.category}" needs a subcategory, one of: ${subs.join(", ")}`,
      });
    }
    if (!subs && e.subcategory !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subcategory"], message: `category "${e.category}" has no subcategories` });
    }
  }) satisfies z.ZodType<VocabEntry>;

export const VocabListSchema = z
  .array(VocabEntrySchema)
  .min(1)
  .refine((list) => new Set(list.map((w) => w.id)).size === list.length, {
    message: "Duplicate vocab ids",
  });
