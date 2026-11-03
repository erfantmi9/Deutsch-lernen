import type { I18n2, I18n3, Level } from "./common";

export type GrammarFocus =
  | "v2"
  | "question"
  | "modal-bracket"
  | "separable-bracket"
  | "subordinate-weil"
  | "negation-nicht-kein"
  | "time-manner-place";

export const GRAMMAR_FOCI: readonly GrammarFocus[] = [
  "v2",
  "question",
  "modal-bracket",
  "separable-bracket",
  "subordinate-weil",
  "negation-nicht-kein",
  "time-manner-place",
];

export type SentenceRole =
  | "verb"
  | "subject"
  | "time"
  | "manner"
  | "place"
  | "negation"
  | "object"
  | "question"
  | "connector"
  | "other";

export const SENTENCE_ROLES: readonly SentenceRole[] = [
  "verb",
  "subject",
  "time",
  "manner",
  "place",
  "negation",
  "object",
  "question",
  "connector",
  "other",
];

export interface SentenceExercise {
  id: string;
  level: Level;
  grammarFocus: GrammarFocus;
  /** Correct order; punctuation attached to the last word. */
  tokens: string[];
  /** Optional sentence-part role per token (same length as `tokens`); drives the colour legend. */
  roles?: SentenceRole[];
  distractors?: string[];
  translations: I18n2;
  hint: I18n3;
  explanation: I18n3;
  /** Alternative valid orders (permutations of `tokens`, compared case- and end-punctuation-insensitively). */
  acceptedOrders?: string[][];
}
