import type { ReviewCard } from "./reviewCards";
import { getTopic, TOPIC_IDS, topicCards, topicLabelKey } from "./vocabTopics";
import type { TopicId } from "./vocabTopics";

/**
 * Ready-made flashcard decks: one per vocabulary topic, plus the verbs. A deck is flipped through freely (no schedule,
 * no account); words the learner did not know can then go into their own spaced-repetition cards. Pure.
 */

export type DeckId = TopicId | "verbs";

export const DECK_IDS: readonly DeckId[] = [...TOPIC_IDS, "verbs"];

export const isDeckId = (id: string): id is DeckId => (DECK_IDS as readonly string[]).includes(id);

/** Message key (Vocabulary namespace) of a deck's name. */
export const deckLabelKey = (id: DeckId): string => (id === "verbs" ? "kinds.verb" : topicLabelKey(getTopic(id)!));

export function deckCards(cards: readonly ReviewCard[], id: DeckId): ReviewCard[] {
  if (id === "verbs") return cards.filter((c) => c.kind === "verb");
  const topic = getTopic(id);
  return topic ? topicCards(cards, topic) : [];
}

/** Which side the learner sees first: the German word, or its meaning (then they recall the German). */
export type Direction = "de" | "meaning";

export interface DeckRound {
  order: string[];
  index: number;
  flipped: boolean;
  known: string[];
  unknown: string[];
}

export function startRound(ids: readonly string[], random: (() => number) | null): DeckRound {
  const order = [...ids];
  if (random) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return { order, index: 0, flipped: false, known: [], unknown: [] };
}

export const flipCard = (r: DeckRound): DeckRound => (r.flipped ? r : { ...r, flipped: true });

/** Marks the current card (only after it was turned over) and moves on. */
export function markCard(r: DeckRound, knew: boolean): DeckRound {
  if (!r.flipped || r.index >= r.order.length) return r;
  const id = r.order[r.index];
  return {
    ...r,
    index: r.index + 1,
    flipped: false,
    known: knew ? [...r.known, id] : r.known,
    unknown: knew ? r.unknown : [...r.unknown, id],
  };
}

export const roundDone = (r: DeckRound): boolean => r.index >= r.order.length;
