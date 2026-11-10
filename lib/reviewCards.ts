import type { I18n2, I18n3 } from "../types/common";
import type { VerbEntry } from "../types/verb";
import type { Article, VocabEntry } from "../types/vocab";
import type { AdjectiveEntry, AdverbEntry, PhraseEntry, PrepositionEntry } from "../types/vocab-extended";

/**
 * One flashcard model for everything that can be reviewed. Pure: the content is passed in.
 * The card id is `<kind>:<item id>`, so the same word as noun and verb never collides.
 */

export const REVIEW_KINDS = ["noun", "verb", "adjective", "adverb", "preposition", "phrase"] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export interface ReviewCard {
  id: string;
  kind: ReviewKind;
  /** German front, e.g. "der Kopf" or "gehen". */
  front: string;
  /** Sub-group for filtering: noun category, adverb kind, preposition case, phrase situation. */
  group?: string;
  /** Only for nouns in a category with sub-groups (see VOCAB_SUBCATEGORIES). */
  subgroup?: string;
  /** Only for nouns: colours the front by article. */
  article?: Article;
  /** German detail line for the back: plural, key forms, case, typical reply. */
  detail?: string;
  translations: I18n2;
  example?: I18n3;
}

export const cardId = (kind: ReviewKind, id: string): string => `${kind}:${id}`;

export function parseCardId(id: string): { kind: ReviewKind; id: string } | null {
  const i = id.indexOf(":");
  if (i <= 0) return null;
  const kind = id.slice(0, i);
  return (REVIEW_KINDS as readonly string[]).includes(kind) ? { kind: kind as ReviewKind, id: id.slice(i + 1) } : null;
}

const CASE_LABEL = { akk: "Akk.", dat: "Dat." } as const;

export function prepositionDetail(p: PrepositionEntry): string {
  if (p.wechsel) return "+ Akk. / Dat.";
  return `+ ${p.cases.map((c) => CASE_LABEL[c]).join(" / ")}`;
}

export function verbDetail(v: VerbEntry): string {
  const er = v.separable ? `${v.present.er_sie_es} ... ${v.separable.prefix}` : v.present.er_sie_es;
  const aux = v.perfekt.auxiliary === "haben" ? "hat" : "ist";
  return `er/sie/es ${er} · ${aux} ${v.perfekt.partizip2}`;
}

export function buildReviewCards(input: {
  nouns: readonly VocabEntry[];
  verbs: readonly VerbEntry[];
  adjectives: readonly AdjectiveEntry[];
  adverbs: readonly AdverbEntry[];
  prepositions: readonly PrepositionEntry[];
  phrases: readonly PhraseEntry[];
}): ReviewCard[] {
  const cards: ReviewCard[] = [];

  for (const n of input.nouns) {
    cards.push({
      id: cardId("noun", n.id),
      kind: "noun",
      group: n.category,
      subgroup: n.subcategory,
      front: `${n.article} ${n.word}`,
      article: n.article,
      detail: n.plural === "–" ? undefined : `die ${n.plural}`,
      translations: n.translations,
      example: n.example,
    });
  }
  for (const v of input.verbs) {
    cards.push({
      id: cardId("verb", v.id),
      kind: "verb",
      front: v.infinitive,
      detail: verbDetail(v),
      translations: v.translations,
      example: v.example,
    });
  }
  for (const a of input.adjectives) {
    cards.push({
      id: cardId("adjective", a.id),
      kind: "adjective",
      front: a.word,
      detail: a.comparative && a.superlative ? `${a.comparative} · ${a.superlative}` : undefined,
      translations: a.translations,
      example: a.example,
    });
  }
  for (const a of input.adverbs) {
    cards.push({
      id: cardId("adverb", a.id),
      kind: "adverb",
      group: a.kind,
      front: a.word,
      translations: a.translations,
      example: a.example,
    });
  }
  for (const p of input.prepositions) {
    cards.push({
      id: cardId("preposition", p.id),
      kind: "preposition",
      group: p.wechsel ? "wechsel" : p.cases[0],
      front: p.word,
      detail: prepositionDetail(p),
      translations: p.translations,
      example: p.example,
    });
  }
  for (const ph of input.phrases) {
    cards.push({
      id: cardId("phrase", ph.id),
      kind: "phrase",
      group: ph.situation,
      front: ph.text,
      detail: ph.reply,
      translations: ph.translations,
    });
  }
  return cards;
}
