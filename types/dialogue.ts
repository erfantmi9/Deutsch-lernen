import type { I18n3 } from "./common";

export const DIALOGUE_TOPICS = [
  "introduce",
  "order-food",
  "shopping",
  "directions",
  "appointment",
  "form",
  "phone",
  "family",
  "daily-routine",
  "weather",
] as const;
export type DialogueTopic = (typeof DIALOGUE_TOPICS)[number];

export interface DialogueLine {
  speaker: string;
  de: string;
  en: string;
  fa: string;
}

export interface QuizQuestion {
  question: I18n3;
  /** German answer options (language-neutral for the reader). */
  options: string[];
  answer: string;
}

export interface Dialogue {
  id: string;
  topic: DialogueTopic;
  title: I18n3;
  setting: I18n3;
  /** Exactly two speakers, 6 to 10 lines. */
  lines: DialogueLine[];
  /** `noun:<id>` or `verb:<id>`: vocabulary used in the dialogue. */
  vocabIds?: string[];
  grammarLessonIds?: string[];
  /** Exactly four comprehension questions. */
  quiz: QuizQuestion[];
}

export const MIN_DIALOGUE_LINES = 6;
export const MAX_DIALOGUE_LINES = 10;
export const QUIZ_QUESTIONS = 4;
