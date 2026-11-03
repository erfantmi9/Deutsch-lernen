import type { VerbEntry } from "../types/verb";
import { PERSONS } from "../types/verb";
import type { VocabEntry } from "../types/vocab";

/** Looks German words up in the vocabulary (nouns and verbs). Pure; the data is passed in. */

export interface WordHit {
  kind: "noun" | "verb";
  id: string;
  /** Dictionary form: "der Tisch" or "wohnen". */
  display: string;
  /** The word as written in the text. */
  surface: string;
  /** True when the surface form is a plural or a conjugated form of `display`. */
  inflected: boolean;
  translations: { en: string; fa: string };
}

export interface WordIndex {
  nouns: ReadonlyMap<string, WordHit>;
  verbs: ReadonlyMap<string, WordHit>;
}

export function buildWordIndex(nouns: readonly VocabEntry[], verbs: readonly VerbEntry[]): WordIndex {
  const nounMap = new Map<string, WordHit>();
  for (const n of nouns) {
    const base = { kind: "noun" as const, id: n.id, display: `${n.article} ${n.word}`, translations: n.translations };
    nounMap.set(n.word, { ...base, surface: n.word, inflected: false });
    if (n.plural !== "–" && !nounMap.has(n.plural)) nounMap.set(n.plural, { ...base, surface: n.plural, inflected: n.plural !== n.word });
  }

  const verbMap = new Map<string, WordHit>();
  for (const v of verbs) {
    const base = { kind: "verb" as const, id: v.id, display: v.infinitive, translations: v.translations };
    const forms = new Set<string>([v.infinitive, v.perfekt.partizip2, ...PERSONS.map((p) => v.present[p])]);
    for (const form of forms) {
      const key = form.toLowerCase();
      if (!verbMap.has(key)) verbMap.set(key, { ...base, surface: form, inflected: form !== v.infinitive });
    }
  }
  return { nouns: nounMap, verbs: verbMap };
}

/**
 * Nouns are matched case-sensitively (German nouns are capitalised), verbs case-insensitively.
 * A capitalised word at the start of a sentence may also be a verb ("Gehen Sie ...").
 */
export function lookupWord(index: WordIndex, word: string, sentenceStart = false): WordHit | null {
  if (word.length === 0) return null;
  const capitalised = word[0] !== word[0].toLowerCase();
  if (capitalised) {
    const noun = index.nouns.get(word);
    if (noun) return { ...noun, surface: word };
    if (!sentenceStart) return null;
  }
  const verb = index.verbs.get(word.toLowerCase());
  return verb ? { ...verb, surface: word } : null;
}

export interface Token {
  text: string;
  /** True for words, false for spaces and punctuation. */
  isWord: boolean;
  sentenceStart: boolean;
}

/** Splits a line into words and separators, remembering which words start a sentence. */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let atStart = true;
  for (const m of line.matchAll(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*|[^\p{L}\p{N}]+/gu)) {
    const text = m[0];
    const isWord = /[\p{L}\p{N}]/u.test(text[0]);
    out.push({ text, isWord, sentenceStart: isWord && atStart });
    if (isWord) atStart = false;
    else if (/[.!?]/u.test(text)) atStart = true;
  }
  return out;
}

export interface AnnotatedToken {
  text: string;
  hit: WordHit | null;
}

export function annotate(index: WordIndex, line: string): AnnotatedToken[] {
  return tokenize(line).map((t) => ({ text: t.text, hit: t.isWord ? lookupWord(index, t.text, t.sentenceStart) : null }));
}
