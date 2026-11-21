import { checkDictation } from "./dictation";
import type { DictationOp } from "./dictation";
import { cardinal, MAX_CARDINAL } from "./numbers";

/**
 * Speaking (Nachsprechen): the learner says a sentence, the browser's speech recognition writes down what it heard, and
 * that text is compared word by word with the sentence. Pure: no React, no browser APIs.
 *
 * Speech recognition is not a pronunciation test: it guesses the most likely words, so "heard" means "understood".
 * Capital letters and punctuation carry no information here, and ß / ss are the same sound. A word that is only close
 * (schon for schön, one letter off) is shown as close: it may be the learner's pronunciation or the recogniser's guess.
 */

/** ok: understood. close: nearly (an umlaut or one letter off). missing: not understood. */
export type SpeakMark = "ok" | "close" | "missing";

export interface SpeakWord {
  expected: string;
  /** What was understood in its place, when it differs. */
  heard: string | null;
  mark: SpeakMark;
}

export interface SpeakResult {
  words: SpeakWord[];
  /** The recogniser's text the result is based on (the best of its alternatives). */
  heard: string;
  total: number;
  ok: number;
  close: number;
  missing: number;
  /** 0 to 1: a close word counts half. Extra words (fillers, a repeat) are not counted against the learner. */
  score: number;
  passed: boolean;
}

/** Share of words that must be understood (ok or close) for the sentence to count as said. */
export const PASS_SHARE = 0.85;

/**
 * Recognisers write numbers as digits ("Ich habe 2 Kinder"); the sentences have them as words. A number becomes its word
 * ("2" → "zwei"); "1" becomes "ein", far more common in A1 sentences than "eins". Anything else with a digit (times like
 * 7:30, ordinals) is left as it is.
 */
export function wordsForDigits(text: string): string {
  return text.replace(/(^|\s)(\d+)(?=[\s.,!?]|$)/gu, (all, pre: string, digits: string) => {
    const n = Number(digits);
    if (!Number.isInteger(n) || n > MAX_CARDINAL) return all;
    return pre + (n === 1 ? "ein" : cardinal(n));
  });
}

const sameIgnoringSharpS = (a: string, b: string): boolean =>
  a.toLowerCase().replaceAll("ß", "ss") === b.toLowerCase().replaceAll("ß", "ss");

function toWords(ops: DictationOp[]): SpeakWord[] {
  const out: SpeakWord[] = [];
  for (const op of ops) {
    if (op.type === "extra") continue;
    if (op.typed === null) out.push({ expected: op.expected, heard: null, mark: "missing" });
    else if (op.mark === "ok" || op.mark === "case" || sameIgnoringSharpS(op.expected, op.typed))
      out.push({ expected: op.expected, heard: null, mark: "ok" });
    else if (op.mark === "umlaut" || op.mark === "typo") out.push({ expected: op.expected, heard: op.typed, mark: "close" });
    else out.push({ expected: op.expected, heard: op.typed, mark: "missing" });
  }
  return out;
}

/** Compares one recogniser text with the sentence. */
export function checkHeard(sentence: string, heard: string): SpeakResult {
  const words = toWords(checkDictation(sentence, wordsForDigits(heard)).ops);
  const total = words.length;
  const ok = words.filter((w) => w.mark === "ok").length;
  const close = words.filter((w) => w.mark === "close").length;
  const missing = total - ok - close;
  const score = total === 0 ? 0 : (ok + close / 2) / total;
  const passed = total > 0 && (ok + close) / total >= PASS_SHARE;
  return { words, heard: heard.trim(), total, ok, close, missing, score, passed };
}

/**
 * Recognisers return several guesses for one utterance. The learner gets the benefit of the doubt: the guess closest to
 * the sentence counts. Null when nothing was heard.
 */
export function checkSpeech(sentence: string, alternatives: readonly string[]): SpeakResult | null {
  let best: SpeakResult | null = null;
  for (const alt of alternatives) {
    if (alt.trim() === "") continue;
    const r = checkHeard(sentence, alt);
    if (!best || r.score > best.score) best = r;
  }
  return best;
}

/* ---------- progress ---------- */

export interface SpeakStats {
  /** Sentences said well enough at least once (checked by speech recognition, or judged by the learner when recording). */
  speakPassed: string[];
}

export const EMPTY_SPEAK_STATS: SpeakStats = { speakPassed: [] };

export function applySpeak(s: SpeakStats, id: string, passed: boolean): SpeakStats {
  return passed && !s.speakPassed.includes(id) ? { speakPassed: [...s.speakPassed, id] } : s;
}
