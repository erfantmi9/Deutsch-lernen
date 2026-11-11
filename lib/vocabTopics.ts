import type { ReviewCard, ReviewKind } from "./reviewCards";
import { VOCAB_CATEGORIES, VOCAB_SUBCATEGORIES } from "../types/vocab";
import type { VocabCategory } from "../types/vocab";
import { ADJECTIVE_KINDS, ADVERB_KINDS, PHRASE_SITUATIONS } from "../types/vocab-extended";

/**
 * The vocabulary page is a grid of topics: every noun category, then one topic per other word type.
 * A topic page lists its words with an optional sub-filter row. Pure: the cards are passed in.
 */

export const WORD_TYPE_TOPICS = ["adjectives", "adverbs", "prepositions", "phrases"] as const;
export type WordTypeTopic = (typeof WORD_TYPE_TOPICS)[number];
export type TopicId = VocabCategory | WordTypeTopic;

export const TOPIC_IDS: readonly TopicId[] = [...VOCAB_CATEGORIES, ...WORD_TYPE_TOPICS];

const WORD_TYPE_KIND: Readonly<Record<WordTypeTopic, ReviewKind>> = {
  adjectives: "adjective",
  adverbs: "adverb",
  prepositions: "preposition",
  phrases: "phrase",
};

const WORD_TYPE_GROUPS: Readonly<Record<WordTypeTopic, readonly string[]>> = {
  adjectives: ADJECTIVE_KINDS,
  adverbs: ADVERB_KINDS,
  prepositions: ["akk", "dat", "wechsel"],
  phrases: PHRASE_SITUATIONS,
};

export interface Topic {
  id: TopicId;
  kind: ReviewKind;
  /** Only for noun topics. */
  category?: VocabCategory;
  /** Sub-filter values, in display order (may be empty). */
  subgroups: readonly string[];
}

export const isTopicId = (id: string): id is TopicId => (TOPIC_IDS as readonly string[]).includes(id);
export const isWordTypeTopic = (id: TopicId): id is WordTypeTopic => (WORD_TYPE_TOPICS as readonly string[]).includes(id);

export function getTopic(id: string): Topic | undefined {
  if (!isTopicId(id)) return undefined;
  if (isWordTypeTopic(id)) return { id, kind: WORD_TYPE_KIND[id], subgroups: WORD_TYPE_GROUPS[id] };
  return { id, kind: "noun", category: id, subgroups: VOCAB_SUBCATEGORIES[id] ?? [] };
}

/** The value a card is filtered by on its topic page: the noun sub-category, or the group of any other word. */
export const cardSubgroup = (card: ReviewCard): string | undefined => (card.kind === "noun" ? card.subgroup : card.group);

export function topicCards(cards: readonly ReviewCard[], topic: Topic): ReviewCard[] {
  return cards.filter((c) => c.kind === topic.kind && (topic.category === undefined || c.group === topic.category));
}

/** The topic a card is listed under, or undefined for verbs (they have their own page). */
export function topicOfCard(card: ReviewCard): TopicId | undefined {
  if (card.kind === "noun") return card.group as VocabCategory | undefined;
  const entry = Object.entries(WORD_TYPE_KIND).find(([, kind]) => kind === card.kind);
  return entry?.[0] as WordTypeTopic | undefined;
}

/** Message key (in the Vocabulary namespace) of a topic name. */
export const topicLabelKey = (topic: Topic): string => (topic.category ? `groups.noun.${topic.category}` : `kinds.${topic.kind}`);

/** Message key (in the Vocabulary namespace) of a sub-filter label. */
export const subgroupLabelKey = (topic: Topic, sub: string): string =>
  topic.category ? `subgroups.${topic.category}.${sub}` : `groups.${topic.kind}.${sub}`;

/** Share of `ids` that are in the review deck, 0..100, rounded down so 100 only shows when every word is in. */
export function deckPercent(ids: readonly string[], deck: Readonly<Record<string, unknown>>): number {
  if (ids.length === 0) return 0;
  const inDeck = ids.filter((id) => deck[id] !== undefined).length;
  return Math.floor((inDeck / ids.length) * 100);
}

export const normalise = (s: string): string => s.toLowerCase().normalize("NFC");

/**
 * How well a card matches: 0 the German word itself, 1 it starts with the query, 2 contains it, 3 the translation,
 * 4 only the example sentence; undefined for no match.
 */
function matchRank(card: ReviewCard, q: string): number | undefined {
  const german = normalise(card.front).replace(/^(der|die|das) /, "");
  if (german === q) return 0;
  if (german.startsWith(q)) return 1;
  if (german.includes(q)) return 2;
  if (normalise(card.translations.en).includes(q) || card.translations.fa.includes(q)) return 3;
  if (card.example !== undefined && normalise(card.example.de).includes(q)) return 4;
  return undefined;
}

/** Finds words by their German form (with or without article), translation or example; best matches first. */
export function searchCards(cards: readonly ReviewCard[], query: string): ReviewCard[] {
  const q = normalise(query.trim()).replace(/^(der|die|das) /, "");
  if (q === "") return [...cards];
  return cards
    .map((card, i) => ({ card, i, rank: matchRank(card, q) }))
    .filter((m): m is { card: ReviewCard; i: number; rank: number } => m.rank !== undefined)
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((m) => m.card);
}

/** Swatch per colour adjective id (every adjective of kind "color" has one; a test checks it). */
export const COLOR_SWATCH: Readonly<Record<string, string>> = {
  rot: "#e53935",
  blau: "#2f6fe0",
  gruen: "#34a853",
  gelb: "#f6c343",
  schwarz: "#111111",
  weiss: "#ffffff",
  braun: "#8d5a3b",
  grau: "#9aa0a6",
  bunt: "conic-gradient(#e53935, #f6c343, #34a853, #2f6fe0, #9b59d0, #e53935)",
  orange: "#f28c28",
  lila: "#9b59d0",
  rosa: "#f48fb1",
  dunkelblau: "#1e2f6b",
  hellblau: "#7fb6f5",
  dunkelgruen: "#1e6b3a",
  hellgruen: "#9ad66b",
  dunkelrot: "#8b1a1a",
};

/** "dunkelblau" -> ["dunkel", "blau"]: colour words built with hell- / dunkel-. */
export function colorCompound(word: string): readonly [string, string] | null {
  const m = /^(hell|dunkel)(.+)$/.exec(word);
  return m ? [m[1], m[2]] : null;
}
