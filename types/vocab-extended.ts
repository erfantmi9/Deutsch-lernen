import type { I18n2, I18n3, Level } from "./common";

/** Word classes beyond nouns and verbs. Nouns keep using VocabEntry (types/vocab.ts). */

export interface AdjectiveEntry {
  id: string;
  word: string;
  /** Only set when the forms are certain; colours and a few others have none. */
  comparative?: string;
  superlative?: string;
  /** The opposite as a German word, e.g. "klein" for "groß". */
  opposite?: string;
  translations: I18n2;
  example: I18n3;
  level: Level;
}

export const ADVERB_KINDS = ["time", "place", "manner", "degree", "frequency"] as const;
export type AdverbKind = (typeof ADVERB_KINDS)[number];

export interface AdverbEntry {
  id: string;
  word: string;
  kind: AdverbKind;
  translations: I18n2;
  example: I18n3;
  level: Level;
}

export type PrepositionCase = "akk" | "dat";

export interface PrepositionEntry {
  id: string;
  word: string;
  /** One case, or both ("akk" and "dat") for two-way prepositions. */
  cases: PrepositionCase[];
  /** Two-way preposition (Wechselpräposition): dative for where, accusative for where to. */
  wechsel: boolean;
  translations: I18n2;
  example: I18n3;
  level: Level;
}

export const PHRASE_SITUATIONS = [
  "greeting",
  "polite",
  "classroom",
  "shopping",
  "travel",
  "restaurant",
  "help",
  "phone",
] as const;
export type PhraseSituation = (typeof PHRASE_SITUATIONS)[number];

export interface PhraseEntry {
  id: string;
  /** The German phrase. */
  text: string;
  situation: PhraseSituation;
  /** A typical answer, in German. */
  reply?: string;
  translations: I18n2;
  level: Level;
}
