import type { I18n2, I18n3 } from "./common";

/** Short listening texts in the style of the A1 exam: an announcement, a phone message or a short conversation. */
export const MESSAGE_KINDS = ["announcement", "phone", "conversation"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export interface MessageLine {
  /** Announcements and phone messages have one speaker (0); conversations two (0 and 1). */
  speaker: 0 | 1;
  de: string;
  en: string;
  fa: string;
}

export interface ListeningMessage {
  id: string;
  kind: MessageKind;
  /** Where the learner is, shown before listening ("You are at the station."). */
  situation: I18n3;
  lines: MessageLine[];
  question: I18n3;
  /** Three German options; numbers, times and prices in digits. */
  options: string[];
  answer: string;
  /** The words that give the answer; must occur in one of the lines. Highlighted in the transcript. */
  evidence: string;
}

export const MIN_MESSAGE_WORDS = 10;
export const MAX_MESSAGE_WORDS = 60;
export const MAX_MESSAGE_LINES = 6;

/** Sound contrasts German learners (and Persian speakers in particular) mix up. */
export const SOUND_CONTRASTS = ["ue-u", "ue-i", "oe-o", "oe-e", "ei-ie", "long-short", "ch-sch", "s-z"] as const;
export type SoundContrast = (typeof SOUND_CONTRASTS)[number];

export interface PairWord {
  de: string;
  translation: I18n2;
}

/** Two words that differ in one sound only. */
export interface MinimalPair {
  id: string;
  contrast: SoundContrast;
  a: PairWord;
  b: PairWord;
}
