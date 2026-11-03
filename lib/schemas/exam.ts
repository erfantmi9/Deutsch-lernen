import { z } from "zod";
import type { ExamData } from "../../types/exam";
import { I18n2Schema, I18n3Schema, TextSchema } from "./common";

const ids = (list: ReadonlyArray<{ id: string }>) => new Set(list.map((x) => x.id)).size === list.length;

const lower = TextSchema.refine((s) => s === s.toLowerCase(), { message: "must be lower-case" });

const ListeningItemSchema = z
  .object({
    id: TextSchema,
    script: TextSchema,
    translation: I18n2Schema,
    question: TextSchema,
    options: z.array(TextSchema).length(3),
    answer: TextSchema,
  })
  .refine((i) => i.options.includes(i.answer), { message: "answer must be one of the options" })
  .refine((i) => new Set(i.options).size === i.options.length, { message: "options must differ" });

const FormFieldSchema = z.object({ id: TextSchema, label: I18n3Schema, expected: z.array(lower).min(1) });
const MessagePointSchema = z.object({ id: TextSchema, label: I18n3Schema, patterns: z.array(lower).min(1) });

const SpeakingPartSchema = z
  .object({
    id: TextSchema,
    title: I18n3Schema,
    instruction: I18n3Schema,
    cues: z.array(TextSchema).min(1),
    checklist: z.array(z.object({ id: TextSchema, label: I18n3Schema })).min(1),
    model: z.array(TextSchema).min(1),
  })
  .refine((p) => ids(p.checklist), { message: "duplicate checklist ids" });

export const ExamSchema = z.object({
  lesen: z.object({ textIds: z.array(TextSchema).min(1) }),
  hoeren: z.array(ListeningItemSchema).min(1).refine(ids, { message: "duplicate listening ids" }),
  schreiben: z.object({
    form: z.object({ situation: I18n3Schema, fields: z.array(FormFieldSchema).min(1).refine(ids, { message: "duplicate field ids" }) }),
    message: z.object({
      prompt: I18n3Schema,
      minWords: z.number().int().min(1),
      points: z.array(MessagePointSchema).min(1).refine(ids, { message: "duplicate point ids" }),
    }),
  }),
  sprechen: z.array(SpeakingPartSchema).min(1).refine(ids, { message: "duplicate speaking ids" }),
}) satisfies z.ZodType<ExamData>;
