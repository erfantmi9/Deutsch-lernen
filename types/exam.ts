import type { I18n2, I18n3 } from "./common";

/** Practice simulation of an A1 exam. Not the official exam. */

export const EXAM_MODULES = ["lesen", "hoeren", "schreiben", "sprechen"] as const;
export type ExamModule = (typeof EXAM_MODULES)[number];

/** Every module is worth the same, like the real exam. */
export const POINTS_PER_MODULE = 25;
export const PASS_FRACTION = 0.6;

/** Time limits in minutes. */
export const MODULE_MINUTES: Readonly<Record<ExamModule, number>> = { lesen: 25, hoeren: 20, schreiben: 20, sprechen: 15 };

export interface ListeningItem {
  id: string;
  /** German text that is read aloud (and shown if speech is not available). */
  script: string;
  translation: I18n2;
  question: string;
  options: string[];
  answer: string;
}

export interface FormField {
  id: string;
  label: I18n3;
  /** Accepted answers, lower-case. */
  expected: string[];
}

export interface MessagePoint {
  id: string;
  label: I18n3;
  /** Lower-case snippets; the point is earned when the text contains any of them. */
  patterns: string[];
}

export interface SpeakingPart {
  id: string;
  title: I18n3;
  instruction: I18n3;
  cues: string[];
  checklist: { id: string; label: I18n3 }[];
  /** Example answers in German, shown after the self-check. */
  model: string[];
}

export interface ExamData {
  lesen: { textIds: string[] };
  hoeren: ListeningItem[];
  schreiben: {
    form: { situation: I18n3; fields: FormField[] };
    message: { prompt: I18n3; minWords: number; points: MessagePoint[] };
  };
  sprechen: SpeakingPart[];
}
