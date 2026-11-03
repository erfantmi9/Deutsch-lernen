import { z } from "zod";
import { ADVERB_KINDS, PHRASE_SITUATIONS } from "../../types/vocab-extended";
import type { AdjectiveEntry, AdverbEntry, PhraseEntry, PrepositionEntry } from "../../types/vocab-extended";
import { I18n2Schema, I18n3Schema, LevelSchema, TextSchema } from "./common";

const uniqueIds = (list: ReadonlyArray<{ id: string }>) => new Set(list.map((w) => w.id)).size === list.length;

export const AdjectiveEntrySchema = z
  .object({
    id: TextSchema,
    word: TextSchema,
    comparative: TextSchema.optional(),
    superlative: TextSchema.optional(),
    opposite: TextSchema.optional(),
    translations: I18n2Schema,
    example: I18n3Schema,
    level: LevelSchema,
  })
  .refine((a) => (a.comparative === undefined) === (a.superlative === undefined), {
    message: "comparative and superlative must be given together",
  }) satisfies z.ZodType<AdjectiveEntry>;

export const AdverbEntrySchema = z.object({
  id: TextSchema,
  word: TextSchema,
  kind: z.enum(ADVERB_KINDS),
  translations: I18n2Schema,
  example: I18n3Schema,
  level: LevelSchema,
}) satisfies z.ZodType<AdverbEntry>;

export const PrepositionEntrySchema = z
  .object({
    id: TextSchema,
    word: TextSchema,
    cases: z.array(z.enum(["akk", "dat"])).min(1).max(2),
    wechsel: z.boolean(),
    translations: I18n2Schema,
    example: I18n3Schema,
    level: LevelSchema,
  })
  .refine((p) => p.wechsel === (p.cases.length === 2), {
    message: "a two-way preposition has exactly the cases akk and dat, any other has one case",
  }) satisfies z.ZodType<PrepositionEntry>;

export const PhraseEntrySchema = z.object({
  id: TextSchema,
  text: TextSchema,
  situation: z.enum(PHRASE_SITUATIONS),
  reply: TextSchema.optional(),
  translations: I18n2Schema,
  level: LevelSchema,
}) satisfies z.ZodType<PhraseEntry>;

export const AdjectiveListSchema = z.array(AdjectiveEntrySchema).min(1).refine(uniqueIds, { message: "Duplicate adjective ids" });
export const AdverbListSchema = z.array(AdverbEntrySchema).min(1).refine(uniqueIds, { message: "Duplicate adverb ids" });
export const PrepositionListSchema = z.array(PrepositionEntrySchema).min(1).refine(uniqueIds, { message: "Duplicate preposition ids" });
export const PhraseListSchema = z.array(PhraseEntrySchema).min(1).refine(uniqueIds, { message: "Duplicate phrase ids" });
