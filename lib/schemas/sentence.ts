import { z } from "zod";
import type { SentenceExercise } from "../../types/sentence";
import { I18n2Schema, I18n3Schema, LevelSchema, TextSchema } from "./common";

export const GrammarFocusSchema = z.enum([
  "v2",
  "question",
  "modal-bracket",
  "separable-bracket",
  "subordinate-weil",
  "negation-nicht-kein",
  "time-manner-place",
]);

export const SentenceExerciseSchema = z.object({
  id: TextSchema,
  level: LevelSchema,
  grammarFocus: GrammarFocusSchema,
  tokens: z.array(TextSchema).min(1),
  roles: z
    .array(
      z.enum(["verb", "subject", "time", "manner", "place", "negation", "object", "question", "connector", "other"]),
    )
    .optional(),
  distractors: z.array(TextSchema).optional(),
  translations: I18n2Schema,
  hint: I18n3Schema,
  explanation: I18n3Schema,
  acceptedOrders: z.array(z.array(TextSchema)).optional(),
}) satisfies z.ZodType<SentenceExercise>;

export const SentenceListSchema = z.array(SentenceExerciseSchema).min(1);
