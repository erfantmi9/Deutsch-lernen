import type { ClockTime } from "../types/numbers";
import {
  cardinal,
  cardinalVariants,
  colloquialTime,
  daysInMonth,
  formatClock,
  officialTime,
  priceVariants,
  sameTime,
  spokenDate,
} from "./numbers";
import { monthName } from "./numbersData";
import type { NumberDrillKind } from "./numbersStats";
import { checkAnswer } from "./verbDrill";

// Progress bookkeeping lives in numbersStats.ts (no content data); re-exported for convenience.
export * from "./numbersStats";

export type ClockStyle = "official" | "colloquial";

export type NumberQuestion =
  | { kind: "cardinal"; n: number; accepted: string[] }
  | { kind: "reverse"; n: number; words: string }
  | { kind: "price"; euros: number; cents: number; accepted: string[] }
  | { kind: "date"; day: number; month: number; accepted: string[] }
  | { kind: "clock-read"; time: ClockTime; options: string[]; answer: string }
  | { kind: "clock-set"; time: ClockTime; style: ClockStyle; phrase: string };

export type Rng = () => number;

// ------------------------------------------------------------------ random helpers

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CENTS = [0, 5, 10, 20, 25, 30, 40, 50, 60, 75, 80, 90, 95, 99] as const;

/** Time `offset` minutes away from `time`, wrapping around midnight. */
export function shiftTime(time: ClockTime, offset: number): ClockTime {
  const total = (((time.hour * 60 + time.minute + offset) % 1440) + 1440) % 1440;
  return { hour: Math.floor(total / 60), minute: total % 60 };
}

function randomFiveMinuteTime(rng: Rng): ClockTime {
  return { hour: randInt(rng, 0, 23), minute: randInt(rng, 0, 11) * 5 };
}

// ------------------------------------------------------------------ questions

function pickNumber(rng: Rng): number {
  return rng() < 0.03 ? 1000 : randInt(rng, 0, 100);
}

export function makeQuestion(kind: NumberDrillKind, rng: Rng = Math.random): NumberQuestion {
  switch (kind) {
    case "cardinal": {
      const n = pickNumber(rng);
      return { kind, n, accepted: cardinalVariants(n) };
    }
    case "reverse": {
      const n = pickNumber(rng);
      return { kind, n, words: cardinal(n) };
    }
    case "price": {
      const euros = randInt(rng, 0, 20);
      const picked = pick(rng, CENTS);
      const cents = euros === 0 && picked === 0 ? 50 : picked;
      return { kind, euros, cents, accepted: priceVariants(euros, cents) };
    }
    case "date": {
      const month = randInt(rng, 1, 12);
      const day = randInt(rng, 1, daysInMonth(month));
      const spoken = spokenDate(day, monthName(month));
      return { kind, day, month, accepted: [spoken, spoken.replace(/^der /u, "")] };
    }
    case "clock-read": {
      const time = randomFiveMinuteTime(rng);
      const answer = colloquialTime(time) ?? "";
      const offsets = [-60, -55, -50, -45, -40, -35, -30, -25, -20, -15, -10, -5, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
      const distractors: string[] = [];
      for (const off of shuffle(rng, offsets)) {
        const phrase = colloquialTime(shiftTime(time, off));
        if (phrase && phrase !== answer && !distractors.includes(phrase)) distractors.push(phrase);
        if (distractors.length === 3) break;
      }
      return { kind, time, answer, options: shuffle(rng, [answer, ...distractors]) };
    }
    default: {
      const style: ClockStyle = rng() < 0.5 ? "official" : "colloquial";
      const time = style === "official" ? { hour: randInt(rng, 0, 23), minute: pick(rng, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 7, 13, 28, 42]) } : randomFiveMinuteTime(rng);
      const phrase = style === "official" ? officialTime(time) : (colloquialTime(time) ?? "");
      return { kind: "clock-set", time, style, phrase };
    }
  }
}

// ------------------------------------------------------------------ checking

/** Lower-cases and removes spaces and hyphens: "Vierzehn Uhr dreißig" ≈ "vierzehnuhrdreißig". */
export function compact(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[\s-]+/gu, "");
}

/** Strict about ä ö ü ß (returns "umlaut" when only those are missing), lenient about spaces, hyphens and case. */
export function checkNumberAnswer(input: string, accepted: readonly string[]) {
  return checkAnswer(compact(input), accepted.map(compact));
}

export interface QuestionResult {
  correct: boolean;
  /** The answer is only wrong because an umlaut or ß is missing. */
  umlaut: boolean;
  /** The correct answer, ready to show. */
  expected: string;
}

export type QuestionResponse = string | ClockTime;

export function expectedAnswer(q: NumberQuestion): string {
  switch (q.kind) {
    case "cardinal":
    case "price":
    case "date":
      return q.accepted[0];
    case "reverse":
      return String(q.n);
    case "clock-read":
      return q.answer;
    default:
      return formatClock(q.time);
  }
}

export function checkQuestion(q: NumberQuestion, response: QuestionResponse): QuestionResult {
  const expected = expectedAnswer(q);
  const fail: QuestionResult = { correct: false, umlaut: false, expected };

  if (q.kind === "clock-set") {
    if (typeof response === "string") return fail;
    return { correct: sameTime(q.time, response, q.style), umlaut: false, expected };
  }
  if (typeof response !== "string") return fail;

  switch (q.kind) {
    case "reverse": {
      const digits = response.replace(/[\s.]/gu, "");
      return { correct: /^\d+$/u.test(digits) && Number(digits) === q.n, umlaut: false, expected };
    }
    case "clock-read":
      return { correct: response === q.answer, umlaut: false, expected };
    default: {
      const check = checkNumberAnswer(response, q.accepted);
      return { correct: check === "correct", umlaut: check === "umlaut", expected };
    }
  }
}
