import { z } from "zod";
import { MAX_MESSAGE_LINES, MESSAGE_KINDS, SOUND_CONTRASTS } from "../../types/listening";
import type { ListeningMessage, MessageLine, MinimalPair, PairWord } from "../../types/listening";
import { I18n2Schema, I18n3Schema, TextSchema } from "./common";

const MessageLineSchema = z.object({
  speaker: z.union([z.literal(0), z.literal(1)]),
  de: TextSchema,
  en: TextSchema,
  fa: TextSchema,
}) satisfies z.ZodType<MessageLine>;

export const ListeningMessageSchema = z
  .object({
    id: TextSchema,
    kind: z.enum(MESSAGE_KINDS),
    situation: I18n3Schema,
    lines: z.array(MessageLineSchema).min(1).max(MAX_MESSAGE_LINES),
    question: I18n3Schema,
    options: z.array(TextSchema).length(3),
    answer: TextSchema,
    evidence: TextSchema,
  })
  .superRefine((m, ctx) => {
    if (!m.options.includes(m.answer)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["answer"], message: "answer is not one of the options" });
    if (new Set(m.options.map((o) => o.toLowerCase())).size !== m.options.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["options"], message: "options contain duplicates" });
    }
    if (!m.lines.some((l) => l.de.includes(m.evidence))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidence"], message: "evidence does not occur in any line" });
    }
    const speakers = new Set(m.lines.map((l) => l.speaker));
    if (m.kind === "conversation" && speakers.size !== 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines"], message: "a conversation needs speakers 0 and 1" });
    }
    if (m.kind !== "conversation" && (speakers.size !== 1 || !speakers.has(0))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lines"], message: `a ${m.kind} has one speaker (0)` });
    }
  }) satisfies z.ZodType<ListeningMessage>;

export const ListeningMessageListSchema = z.array(ListeningMessageSchema).min(1);

const PairWordSchema = z.object({ de: TextSchema, translation: I18n2Schema }) satisfies z.ZodType<PairWord>;

export const MinimalPairSchema = z
  .object({ id: TextSchema, contrast: z.enum(SOUND_CONTRASTS), a: PairWordSchema, b: PairWordSchema })
  .refine((p) => p.a.de.toLowerCase() !== p.b.de.toLowerCase(), { message: "the two words must differ" }) satisfies z.ZodType<MinimalPair>;

export const MinimalPairListSchema = z.array(MinimalPairSchema).min(1);
