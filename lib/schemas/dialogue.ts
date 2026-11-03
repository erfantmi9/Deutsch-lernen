import { z } from "zod";
import {
  DIALOGUE_TOPICS,
  MAX_DIALOGUE_LINES,
  MIN_DIALOGUE_LINES,
  QUIZ_QUESTIONS,
} from "../../types/dialogue";
import type { Dialogue, DialogueLine, QuizQuestion } from "../../types/dialogue";
import { I18n3Schema, TextSchema } from "./common";

export const DialogueLineSchema = z.object({
  speaker: TextSchema,
  de: TextSchema,
  en: TextSchema,
  fa: TextSchema,
}) satisfies z.ZodType<DialogueLine>;

export const QuizQuestionSchema = z
  .object({
    question: I18n3Schema,
    options: z.array(TextSchema).min(3).max(4),
    answer: TextSchema,
  })
  .superRefine((q, ctx) => {
    if (!q.options.includes(q.answer)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["answer"], message: "answer is not one of the options" });
    }
    if (new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "options contain duplicates" });
    }
  }) satisfies z.ZodType<QuizQuestion>;

export const DialogueSchema = z
  .object({
    id: TextSchema,
    topic: z.enum(DIALOGUE_TOPICS),
    title: I18n3Schema,
    setting: I18n3Schema,
    lines: z.array(DialogueLineSchema).min(MIN_DIALOGUE_LINES).max(MAX_DIALOGUE_LINES),
    vocabIds: z.array(TextSchema).optional(),
    grammarLessonIds: z.array(TextSchema).optional(),
    quiz: z.array(QuizQuestionSchema).length(QUIZ_QUESTIONS),
  })
  .superRefine((d, ctx) => {
    const speakers = new Set(d.lines.map((l) => l.speaker));
    if (speakers.size !== 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines"], message: `needs exactly 2 speakers (has ${speakers.size})` });
    }
  }) satisfies z.ZodType<Dialogue>;

export const DialogueListSchema = z
  .array(DialogueSchema)
  .min(1)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((d, i) => {
      if (seen.has(d.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `duplicate id "${d.id}"` });
      seen.add(d.id);
    });
  });
