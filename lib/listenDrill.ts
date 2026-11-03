import { cardinal } from "./numbers";
import type { ReviewCard } from "./reviewCards";

/** Listening drills. Pure: the random source and the cards are passed in. */

export type Rng = () => number;
export type ListenKind = "word" | "number";
export type TranslationLocale = "en" | "fa";

export const ROUND_LENGTH = 10;
export const OPTION_COUNT = 4;
/** Numbers asked in the number drill (kept to what the app can spell). */
export const NUMBER_MAX = 100;

export interface WordQuestion {
  kind: "word";
  /** What the speaker reads, e.g. "der Kopf". */
  spoken: string;
  cardId: string;
  /** Translation choices in the reader's language, shuffled. */
  options: string[];
  answer: string;
}

export interface NumberQuestion {
  kind: "number";
  /** What the speaker reads, e.g. "dreiundzwanzig". */
  spoken: string;
  value: number;
  answer: string;
}

export type ListenQuestion = WordQuestion | NumberQuestion;

function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Phrases are whole sentences: they make poor "which word" questions, so only single words are used. */
export const isDrillCard = (c: ReviewCard): boolean => c.kind !== "phrase";

export function buildWordQuestion(cards: readonly ReviewCard[], locale: TranslationLocale, rng: Rng, excludeId?: string): WordQuestion {
  const pool = cards.filter(isDrillCard);
  if (pool.length < OPTION_COUNT) throw new Error("Not enough cards for a listening question");
  const candidates = pool.filter((c) => c.id !== excludeId);
  const card = candidates[Math.floor(rng() * candidates.length)];
  const answer = card.translations[locale];
  // Distractors share the kind where possible and never repeat the right translation.
  const sameKind = shuffle(pool.filter((c) => c.id !== card.id && c.kind === card.kind), rng);
  const others = shuffle(pool.filter((c) => c.id !== card.id && c.kind !== card.kind), rng);
  const wrong: string[] = [];
  for (const c of [...sameKind, ...others]) {
    const text = c.translations[locale];
    if (text !== answer && !wrong.includes(text)) wrong.push(text);
    if (wrong.length === OPTION_COUNT - 1) break;
  }
  return { kind: "word", spoken: card.front, cardId: card.id, options: shuffle([answer, ...wrong], rng), answer };
}

export function buildNumberQuestion(rng: Rng, excludeValue?: number): NumberQuestion {
  let value = Math.floor(rng() * (NUMBER_MAX + 1));
  if (value === excludeValue) value = (value + 1) % (NUMBER_MAX + 1);
  return { kind: "number", spoken: cardinal(value), value, answer: String(value) };
}

/** Accepts digits with optional surrounding spaces, including Persian and Arabic-Indic digits. */
export function normaliseDigits(input: string): string {
  return input
    .trim()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function checkListenAnswer(q: ListenQuestion, given: string): boolean {
  if (q.kind === "word") return given === q.answer;
  const digits = normaliseDigits(given);
  return /^\d{1,3}$/.test(digits) && Number(digits) === q.value;
}
