import { PERSONS } from "../types/verb";
import type { Person, VerbEntry } from "../types/verb";

export type DrillMode = "present" | "perfekt" | "mixed";
export type DrillKind = "present" | "perfekt";
export type CheckResult = "correct" | "umlaut" | "wrong";

export interface DrillQuestion {
  verb: VerbEntry;
  person: Person;
  kind: DrillKind;
}

export const PRONOUN: Record<Person, string> = {
  ich: "ich",
  du: "du",
  er_sie_es: "er/sie/es",
  wir: "wir",
  ihr: "ihr",
  sie_Sie: "sie/Sie",
};

export const WRONG_WEIGHT = 4;

/** NFC-normalise, trim, collapse spaces, lower-case. Umlauts and ß are kept (strict). */
export function normalizeAnswer(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function stripUmlauts(s: string): string {
  return s.replace(/ä/gu, "a").replace(/ö/gu, "o").replace(/ü/gu, "u").replace(/ß/gu, "ss");
}

/**
 * Case-insensitive, but umlauts and ß are compared strictly.
 * Returns "umlaut" when the answer is only wrong because of umlauts/ß (so the UI can hint).
 */
export function checkAnswer(input: string, accepted: string | readonly string[]): CheckResult {
  const list = typeof accepted === "string" ? [accepted] : accepted;
  const a = normalizeAnswer(input);
  if (list.some((e) => normalizeAnswer(e) === a)) return "correct";
  if (a.length > 0) {
    const s = stripUmlauts(a);
    if (list.some((e) => stripUmlauts(normalizeAnswer(e)) === s)) return "umlaut";
  }
  return "wrong";
}

/** Accepted answers for a present-tense question. Separable verbs accept the stem form with or without the prefix. */
export function presentAnswers(verb: VerbEntry, person: Person): { display: string; accepted: string[] } {
  const form = verb.present[person];
  if (verb.separable) {
    const full = `${form} ${verb.separable.prefix}`;
    return { display: full, accepted: [full, form] };
  }
  return { display: form, accepted: [form] };
}

export interface PerfektCheck {
  auxCorrect: boolean;
  participle: CheckResult;
  correct: boolean;
}

export function checkPerfekt(
  auxChoice: "haben" | "sein" | null,
  input: string,
  verb: VerbEntry,
): PerfektCheck {
  const auxCorrect = auxChoice === verb.perfekt.auxiliary;
  const participle = checkAnswer(input, verb.perfekt.partizip2);
  return { auxCorrect, participle, correct: auxCorrect && participle === "correct" };
}

function weightedIndex(weights: readonly number[], rng: () => number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

/** Weighted-random question. Verbs answered wrongly are WRONG_WEIGHT times likelier; never the same verb twice in a row. */
export function pickQuestion(
  pool: readonly VerbEntry[],
  mode: DrillMode,
  wrongVerbIds: readonly string[],
  lastVerbId: string | null,
  rng: () => number = Math.random,
): DrillQuestion {
  if (pool.length === 0) throw new Error("pickQuestion: empty pool");
  const candidates = pool.length > 1 ? pool.filter((v) => v.id !== lastVerbId) : pool;
  const weights = candidates.map((v) => (wrongVerbIds.includes(v.id) ? WRONG_WEIGHT : 1));
  const verb = candidates[weightedIndex(weights, rng)];
  const person = PERSONS[Math.min(PERSONS.length - 1, Math.floor(rng() * PERSONS.length))];
  const kind: DrillKind = mode === "mixed" ? (rng() < 0.5 ? "present" : "perfekt") : mode;
  return { verb, person, kind };
}

export interface DrillStats {
  score: number;
  streak: number;
  bestStreak: number;
  wrongVerbIds: string[];
}

export function applyResult(stats: DrillStats, verbId: string, correct: boolean): DrillStats {
  const streak = correct ? stats.streak + 1 : 0;
  return {
    score: correct ? stats.score + 1 : stats.score,
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    wrongVerbIds: correct
      ? stats.wrongVerbIds.filter((id) => id !== verbId)
      : stats.wrongVerbIds.includes(verbId)
        ? stats.wrongVerbIds
        : [...stats.wrongVerbIds, verbId],
  };
}
