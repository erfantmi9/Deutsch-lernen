import type { I18n3 } from "./common";

export const GRAMMAR_TOPICS = [
  "pronouns",
  "cases",
  "articles",
  "possessives",
  "negation",
  "plural",
  "prepositions",
  "questions",
  "imperative",
  "modal",
  "word-order",
  "perfekt",
  "separable",
  "conjunctions",
] as const;
export type GrammarTopic = (typeof GRAMMAR_TOPICS)[number];

/** The grammar page groups lessons by these headings, in this order. Labels: `Grammar.groups.<group>`. */
export const GRAMMAR_GROUPS = ["nouns", "pronouns", "verbs", "prepositions", "sentences"] as const;
export type GrammarGroup = (typeof GRAMMAR_GROUPS)[number];

export const GRAMMAR_GROUP_OF_TOPIC: Readonly<Record<GrammarTopic, GrammarGroup>> = {
  articles: "nouns",
  cases: "nouns",
  plural: "nouns",
  pronouns: "pronouns",
  possessives: "pronouns",
  modal: "verbs",
  imperative: "verbs",
  perfekt: "verbs",
  separable: "verbs",
  prepositions: "prepositions",
  "word-order": "sentences",
  questions: "sentences",
  negation: "sentences",
  conjunctions: "sentences",
};

export const EXERCISE_TYPES = ["choice", "fill", "transform"] as const;
export type GrammarExerciseType = (typeof EXERCISE_TYPES)[number];

/** Marks the gap in `GrammarExercise.sentenceDe`. */
export const GAP = "___";

/**
 * Table cells are language-neutral strings:
 * - `gloss:<term>` is replaced by the glossary term in the reader's language,
 * - anything else is German content (rendered left-to-right), `**x**` marks a changed part.
 */
export interface GrammarTable {
  headers: string[];
  rows: string[][];
}

export interface GrammarSection {
  heading: I18n3;
  /** Short markdown: paragraphs, "- " lists, **bold**, `German text`. */
  body: I18n3;
  table?: GrammarTable;
}

export interface GrammarExample {
  de: string;
  en: string;
  fa: string;
  /** Substrings of `de` to emphasise. */
  highlight?: string[];
}

export interface GrammarLesson {
  id: string;
  order: number;
  topic: GrammarTopic;
  title: I18n3;
  summary: I18n3;
  sections: GrammarSection[];
  examples: GrammarExample[];
  exerciseIds: string[];
}

export interface GrammarExercise {
  id: string;
  lessonId: string;
  type: GrammarExerciseType;
  prompt: I18n3;
  /** German sentence containing exactly one gap (`___`). */
  sentenceDe: string;
  /** Required for `choice`. */
  options?: string[];
  answer: string;
  acceptedAnswers?: string[];
  explanation: I18n3;
}

export interface GlossaryEntry {
  term: string;
  en: string;
  fa: string;
  de: string;
}
