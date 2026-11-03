import type { I18n3 } from "./common";

export const READING_KINDS = ["postcard", "email", "notice", "menu", "timetable", "ad", "message"] as const;
export type ReadingKind = (typeof READING_KINDS)[number];

export interface TrueFalseTask {
  id: string;
  type: "true-false";
  /** German statement about the text. */
  statement: string;
  answer: boolean;
  /** Passage of the text that proves the answer (shown after checking). */
  evidence: string;
}

export interface ChoiceTask {
  id: string;
  type: "choice";
  question: string;
  options: string[];
  answer: string;
  evidence: string;
}

export interface MatchingTask {
  id: string;
  type: "matching";
  /** Instruction for the learner. */
  prompt: I18n3;
  /** Every item has exactly one answer; `options` contains the answers plus at least one extra. */
  pairs: { item: string; answer: string }[];
  options: string[];
}

export type ReadingTask = TrueFalseTask | ChoiceTask | MatchingTask;

export interface ReadingText {
  id: string;
  kind: ReadingKind;
  title: I18n3;
  /** German text, lines separated by \n. */
  text: string;
  translation: { en: string; fa: string };
  /** Exactly four tasks. */
  tasks: ReadingTask[];
}

export const MIN_TEXT_WORDS = 40;
export const MAX_TEXT_WORDS = 80;
export const TASKS_PER_TEXT = 4;
