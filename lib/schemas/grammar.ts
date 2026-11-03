import { z } from "zod";
import { EXERCISE_TYPES, GAP, GRAMMAR_TOPICS } from "../../types/grammar";
import type { GlossaryEntry, GrammarExercise, GrammarLesson } from "../../types/grammar";
import { I18n3Schema, TextSchema } from "./common";

export const GrammarTableSchema = z
  .object({
    headers: z.array(TextSchema).min(2),
    rows: z.array(z.array(TextSchema).min(2)).min(1),
  })
  .superRefine((t, ctx) => {
    t.rows.forEach((row, i) => {
      if (row.length !== t.headers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows", i],
          message: `row has ${row.length} cells but there are ${t.headers.length} headers`,
        });
      }
    });
  });

export const GrammarSectionSchema = z.object({
  heading: I18n3Schema,
  body: I18n3Schema,
  table: GrammarTableSchema.optional(),
});

export const GrammarExampleSchema = z.object({
  de: TextSchema,
  en: TextSchema,
  fa: TextSchema,
  highlight: z.array(TextSchema).optional(),
});

export const GrammarLessonSchema = z.object({
  id: TextSchema,
  order: z.number().int().positive(),
  topic: z.enum(GRAMMAR_TOPICS),
  title: I18n3Schema,
  summary: I18n3Schema,
  sections: z.array(GrammarSectionSchema).min(1),
  examples: z.array(GrammarExampleSchema).min(1),
  exerciseIds: z.array(TextSchema).min(1),
}) satisfies z.ZodType<GrammarLesson>;

export const GrammarExerciseSchema = z
  .object({
    id: TextSchema,
    lessonId: TextSchema,
    type: z.enum(EXERCISE_TYPES),
    prompt: I18n3Schema,
    sentenceDe: TextSchema,
    options: z.array(TextSchema).min(2).optional(),
    answer: TextSchema,
    acceptedAnswers: z.array(TextSchema).optional(),
    explanation: I18n3Schema,
  })
  .superRefine((e, ctx) => {
    const gaps = e.sentenceDe.split(GAP).length - 1;
    if (gaps !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sentenceDe"],
        message: `must contain exactly one gap "${GAP}" (found ${gaps})`,
      });
    }
    if (e.type === "choice") {
      if (!e.options) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "choice exercises need options" });
      } else if (!e.options.includes(e.answer)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["answer"], message: "answer is not one of the options" });
      }
    }
  }) satisfies z.ZodType<GrammarExercise>;

export const GlossaryEntrySchema = z.object({
  term: TextSchema,
  en: TextSchema,
  fa: TextSchema,
  de: TextSchema,
}) satisfies z.ZodType<GlossaryEntry>;

function uniqueBy<T>(items: readonly T[], key: (item: T) => string | number, label: string, ctx: z.RefinementCtx): void {
  const seen = new Set<string | number>();
  items.forEach((item, i) => {
    const k = key(item);
    if (seen.has(k)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `duplicate ${label} "${k}"` });
    }
    seen.add(k);
  });
}

export const GrammarLessonListSchema = z.array(GrammarLessonSchema).min(1).superRefine((list, ctx) => {
  uniqueBy(list, (l) => l.id, "id", ctx);
  uniqueBy(list, (l) => l.order, "order", ctx);
});

export const GrammarExerciseListSchema = z
  .array(GrammarExerciseSchema)
  .min(1)
  .superRefine((list, ctx) => uniqueBy(list, (e) => e.id, "id", ctx));

export const GlossaryListSchema = z
  .array(GlossaryEntrySchema)
  .min(1)
  .superRefine((list, ctx) => uniqueBy(list, (g) => g.term, "term", ctx));
