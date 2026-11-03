import type { Dialogue } from "../types/dialogue";
import type { GrammarLesson } from "../types/grammar";
import type { ReadingText } from "../types/reading";
import type { VerbEntry } from "../types/verb";
import type { VocabEntry } from "../types/vocab";
import type { AdjectiveEntry, AdverbEntry, PhraseEntry, PrepositionEntry } from "../types/vocab-extended";

/** Client-side search over words, verbs, grammar lessons, dialogues and reading texts. Pure. */

export const SEARCH_KINDS = ["noun", "verb", "adjective", "adverb", "preposition", "phrase", "grammar", "dialogue", "reading"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export type SearchLocale = "en" | "fa" | "de";

export interface SearchItem {
  id: string;
  kind: SearchKind;
  /** Main line: the German word, or the title in the reader's language. */
  title: string;
  /** Second line: translation or summary in the reader's language. */
  sub: string;
  /** Locale-less path, possibly with a query string. */
  href: string;
  /** Folded text that queries are matched against (all languages). */
  haystack: string;
}

const ZWNJ = /‌/g;

/** Spellings to match against: with ae/oe/ue (Maedchen) and with plain vowels (Madchen). Persian: no zero-width joiners. */
export function foldVariants(input: string): string[] {
  const base = input.toLowerCase().replace(ZWNJ, "").replace(/ß/g, "ss");
  const ae = base.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue");
  const plain = base.replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u");
  return ae === plain ? [ae] : [ae, plain];
}

const haystackOf = (parts: readonly string[]): string => foldVariants(parts.join(" \n ")).join(" \n ");

const sub = (en: string, fa: string, locale: SearchLocale): string => (locale === "fa" ? fa : en);

export function buildSearchIndex(
  locale: SearchLocale,
  data: {
    nouns: readonly VocabEntry[];
    verbs: readonly VerbEntry[];
    adjectives: readonly AdjectiveEntry[];
    adverbs: readonly AdverbEntry[];
    prepositions: readonly PrepositionEntry[];
    phrases: readonly PhraseEntry[];
    lessons: readonly GrammarLesson[];
    dialogues: readonly Dialogue[];
    reading: readonly ReadingText[];
  },
): SearchItem[] {
  const items: SearchItem[] = [];
  const word = (kind: SearchKind, id: string, title: string, tr: { en: string; fa: string }, extra: readonly string[]) =>
    items.push({
      id: `${kind}:${id}`,
      kind,
      title,
      sub: sub(tr.en, tr.fa, locale),
      href: `/vocabulary?kind=${kind}&q=${encodeURIComponent(title)}`,
      haystack: haystackOf([title, tr.en, tr.fa, ...extra]),
    });

  for (const n of data.nouns) word("noun", n.id, `${n.article} ${n.word}`, n.translations, [n.plural, n.example.de]);
  for (const a of data.adjectives) word("adjective", a.id, a.word, a.translations, [a.comparative ?? "", a.superlative ?? "", a.example.de]);
  for (const a of data.adverbs) word("adverb", a.id, a.word, a.translations, [a.example.de]);
  for (const p of data.prepositions) word("preposition", p.id, p.word, p.translations, [p.example.de]);
  for (const p of data.phrases) word("phrase", p.id, p.text, p.translations, [p.reply ?? ""]);

  for (const v of data.verbs) {
    items.push({
      id: `verb:${v.id}`,
      kind: "verb",
      title: v.infinitive,
      sub: sub(v.translations.en, v.translations.fa, locale),
      href: `/verbs?verb=${encodeURIComponent(v.id)}`,
      haystack: haystackOf([v.infinitive, v.perfekt.partizip2, ...Object.values(v.present), v.translations.en, v.translations.fa, v.example.de]),
    });
  }

  for (const l of data.lessons) {
    items.push({
      id: `grammar:${l.id}`,
      kind: "grammar",
      title: l.title[locale],
      sub: l.summary[locale],
      href: `/grammar/${l.id}`,
      haystack: haystackOf([l.title.en, l.title.fa, l.title.de, l.summary.en, l.summary.de]),
    });
  }
  for (const d of data.dialogues) {
    items.push({
      id: `dialogue:${d.id}`,
      kind: "dialogue",
      title: d.title[locale],
      sub: "",
      href: `/dialogues/${d.id}`,
      haystack: haystackOf([d.title.en, d.title.fa, d.title.de]),
    });
  }
  for (const r of data.reading) {
    items.push({
      id: `reading:${r.id}`,
      kind: "reading",
      title: r.title[locale],
      sub: "",
      href: `/reading/${r.id}`,
      haystack: haystackOf([r.title.en, r.title.fa, r.title.de]),
    });
  }
  return items;
}

export const MAX_RESULTS = 40;
export const MIN_QUERY_LENGTH = 2;

function score(item: SearchItem, variants: readonly string[], titleVariants: readonly string[]): number {
  let best = 0;
  for (const q of variants) {
    if (!item.haystack.includes(q)) continue;
    best = Math.max(best, 30);
  }
  if (best === 0) return 0;
  for (const q of variants) {
    for (const t of titleVariants) {
      // "der Kopf" is also found by "kopf": compare against the word without its article.
      const bare = t.replace(/^(der|die|das) /, "");
      if (t === q || bare === q) best = Math.max(best, 100);
      else if (t.startsWith(q) || bare.startsWith(q)) best = Math.max(best, 80);
      else if (t.includes(q)) best = Math.max(best, 60);
    }
  }
  return best;
}

/** Best matches first; words before lessons on equal scores; shorter titles first. Empty for very short queries. */
export function searchItems(items: readonly SearchItem[], query: string, limit: number = MAX_RESULTS): SearchItem[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];
  const variants = foldVariants(trimmed);
  return items
    .map((item) => ({ item, s: score(item, variants, foldVariants(item.title)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || SEARCH_KINDS.indexOf(a.item.kind) - SEARCH_KINDS.indexOf(b.item.kind) || a.item.title.length - b.item.title.length || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((x) => x.item);
}
