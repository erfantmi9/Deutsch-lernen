import type { I18n2 } from "../types/common";

/**
 * Dictation (Diktat): hear a sentence, type it. Pure: no React, no randomness of its own.
 * The learner's text is aligned word by word with the sentence, so one forgotten word does not mark everything after
 * it wrong, and small slips (capital letter, ä written as a or ae, one typo) are told apart from wrong words.
 */

export interface DictationSentence {
  /** `d:<dialogueId>:<line>`, `m:<messageId>:<line>` or `s:<sentenceId>`. */
  id: string;
  de: string;
  translation: I18n2;
}

export const DICTATION_LEVELS = ["short", "medium", "long"] as const;
export type DictationLevel = (typeof DICTATION_LEVELS)[number];

/** Word count per level (inclusive). Sentences outside every range are not used. */
export const LEVEL_WORDS: Record<DictationLevel, readonly [number, number]> = {
  short: [3, 5],
  medium: [6, 8],
  long: [9, 14],
};

export const DICTATION_ROUND = 5;

/** Longest part played by the "in parts" buttons. */
export const PART_WORDS = 4;

const EDGE_PUNCTUATION = /^[.,!?;:"'„“”‚‘’«»()\-–—…]+|[.,!?;:"'„“”‚‘’«»()\-–—…]+$/gu;

/** The words of a sentence without punctuation ("Wie heißt du?" → ["Wie", "heißt", "du"]). */
export function dictationWords(text: string): string[] {
  return text
    .normalize("NFC")
    .split(/\s+/u)
    .map((w) => w.replace(EDGE_PUNCTUATION, ""))
    .filter((w) => w !== "");
}

export function levelOf(text: string): DictationLevel | null {
  const n = dictationWords(text).length;
  return DICTATION_LEVELS.find((l) => n >= LEVEL_WORDS[l][0] && n <= LEVEL_WORDS[l][1]) ?? null;
}

/**
 * Can a sentence be dictated fairly? Digits (is it "3" or "drei"?), abbreviations and quoted speech are left out, and so
 * is anything outside the level word ranges.
 */
export function isDictatable(text: string): boolean {
  return (
    !/[0-9"„“«»/()]/u.test(text) &&
    !/\b[A-ZÄÖÜ]{2,}\b/u.test(text) &&
    !/(^|\s)(hm+|äh+m?)[\s,.!?]/iu.test(text) &&
    levelOf(text) !== null
  );
}

/** Splits a sentence into parts of at most PART_WORDS words, preferring a break after a comma. Single-word tails join the part before. */
export function sentenceParts(text: string): string[] {
  const tokens = text.trim().split(/\s+/u);
  const parts: string[][] = [];
  let part: string[] = [];
  for (const tok of tokens) {
    part.push(tok);
    if (part.length >= PART_WORDS || (part.length >= 2 && /[,;:]$/u.test(tok))) {
      parts.push(part);
      part = [];
    }
  }
  if (part.length > 0) {
    if (part.length === 1 && parts.length > 0) parts[parts.length - 1].push(...part);
    else parts.push(part);
  }
  return parts.map((p) => p.join(" "));
}

/* ---------- checking ---------- */

/**
 * ok: exactly right. case: only capital / small letters differ. umlaut: ä ö ü ß written as a/ae, o/oe, u/ue, ss.
 * typo: one letter off (words of four letters or more). wrong: another word. missing: not written.
 */
export type WordMark = "ok" | "case" | "umlaut" | "typo" | "wrong" | "missing";

export type DictationOp =
  | { type: "word"; expected: string; typed: string | null; mark: WordMark }
  | { type: "extra"; typed: string };

export interface DictationResult {
  ops: DictationOp[];
  /** Words of the sentence. */
  total: number;
  /** Exactly right. */
  correct: number;
  /** case, umlaut or typo. */
  minor: number;
  /** wrong, missing, or written but not in the sentence. */
  errors: number;
  /** 0 to 1: a minor slip counts half, every extra word takes one off. */
  score: number;
  /** No errors (minor slips allowed). */
  passed: boolean;
}

const MINOR: ReadonlySet<WordMark> = new Set(["case", "umlaut", "typo"]);
export const isMinor = (m: WordMark): boolean => MINOR.has(m);

/** ä → ae etc., lower case. */
const spellOut = (w: string): string =>
  w.toLowerCase().replaceAll("ä", "ae").replaceAll("ö", "oe").replaceAll("ü", "ue").replaceAll("ß", "ss");
/** ä → a etc., lower case. */
const dropDots = (w: string): string =>
  w.toLowerCase().replaceAll("ä", "a").replaceAll("ö", "o").replaceAll("ü", "u").replaceAll("ß", "ss");

export function levenshtein(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/** How a typed word compares with the expected one. */
export function compareWord(expected: string, typed: string): Exclude<WordMark, "missing"> {
  const e = expected.normalize("NFC");
  const t = typed.normalize("NFC");
  if (e === t) return "ok";
  const el = e.toLowerCase();
  const tl = t.toLowerCase();
  if (el === tl) return "case";
  if (spellOut(e) === spellOut(t) || dropDots(e) === dropDots(t) || spellOut(e) === dropDots(t)) return "umlaut";
  if (el.length >= 4 && levenshtein(el, tl) <= 1) return "typo";
  return "wrong";
}

const COST: Record<Exclude<WordMark, "missing">, number> = { ok: 0, case: 0.2, umlaut: 0.2, typo: 0.4, wrong: 1 };
const GAP = 1;

/** Aligns the typed words with the sentence (edit distance over words) and marks each one. */
export function checkDictation(sentence: string, typed: string): DictationResult {
  const exp = dictationWords(sentence);
  const got = dictationWords(typed);
  const n = exp.length;
  const m = got.length;
  // cost[i][j]: best alignment of exp[i..] with got[j..].
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n && j === m) continue;
      let best = Infinity;
      if (i < n && j < m) best = COST[compareWord(exp[i], got[j])] + cost[i + 1][j + 1];
      if (i < n) best = Math.min(best, GAP + cost[i + 1][j]);
      if (j < m) best = Math.min(best, GAP + cost[i][j + 1]);
      cost[i][j] = best;
    }
  }

  const ops: DictationOp[] = [];
  let i = 0;
  let j = 0;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  while (i < n || j < m) {
    if (i < n && j < m) {
      const mark = compareWord(exp[i], got[j]);
      if (near(cost[i][j], COST[mark] + cost[i + 1][j + 1])) {
        ops.push({ type: "word", expected: exp[i], typed: got[j], mark });
        i++;
        j++;
        continue;
      }
    }
    if (i < n && near(cost[i][j], GAP + cost[i + 1][j])) {
      ops.push({ type: "word", expected: exp[i], typed: null, mark: "missing" });
      i++;
    } else {
      ops.push({ type: "extra", typed: got[j] });
      j++;
    }
  }

  let correct = 0;
  let minor = 0;
  let errors = 0;
  for (const op of ops) {
    if (op.type === "extra" || op.mark === "wrong" || op.mark === "missing") errors++;
    else if (op.mark === "ok") correct++;
    else minor++;
  }
  const extra = ops.filter((o) => o.type === "extra").length;
  const score = n === 0 ? 0 : Math.max(0, (correct + minor / 2 - extra) / n);
  return { ops, total: n, correct, minor, errors, score, passed: errors === 0 };
}

/* ---------- rounds ---------- */

export type Rng = () => number;

/**
 * Picks the sentences of a round: not yet passed ones first (in random order), then the rest.
 * `exclude` keeps the sentences of the round just played out where possible.
 */
export function pickRound(
  pool: readonly DictationSentence[],
  level: DictationLevel,
  passed: ReadonlySet<string>,
  rng: Rng,
  size: number = DICTATION_ROUND,
  exclude: ReadonlySet<string> = new Set(),
): DictationSentence[] {
  const inLevel = pool.filter((s) => levelOf(s.de) === level);
  const shuffled = [...inLevel];
  for (let k = shuffled.length - 1; k > 0; k--) {
    const r = Math.floor(rng() * (k + 1));
    [shuffled[k], shuffled[r]] = [shuffled[r], shuffled[k]];
  }
  const rank = (s: DictationSentence) => (passed.has(s.id) ? 2 : 0) + (exclude.has(s.id) ? 1 : 0);
  return shuffled.sort((a, b) => rank(a) - rank(b)).slice(0, size);
}
