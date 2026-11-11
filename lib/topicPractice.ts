import type { ReviewCard } from "./reviewCards";
import { shuffled } from "./shuffle";
import type { Rng } from "./shuffle";

/**
 * Topic practice: a short round of "what does this word mean?" questions with four choices. Pure; the rng is passed
 * in so tests are deterministic.
 */

export const ROUND_SIZE = 10;
export const OPTION_COUNT = 4;

export interface PracticeQuestion {
  /** The asked card. */
  cardId: string;
  /** Card ids whose meanings are offered, in display order; contains `cardId` exactly once. */
  options: string[];
}

/**
 * Picks up to `size` words from `words` and gives each up to OPTION_COUNT - 1 distractors: from `words` first (a
 * colour is asked against other colours), then from `pool` (the whole topic, so a small sub-group still gets enough
 * choices). Two choices never share the same meaning text.
 */
export function buildRound(
  words: readonly ReviewCard[],
  pool: readonly ReviewCard[],
  meaning: (card: ReviewCard) => string,
  rng: Rng,
  size = ROUND_SIZE,
): PracticeQuestion[] {
  const inWords = new Set(words.map((w) => w.id));
  const rest = pool.filter((c) => !inWords.has(c.id));
  return shuffled(words, rng)
    .slice(0, size)
    .map((card) => {
      const seen = new Set([meaning(card)]);
      const distractors: string[] = [];
      for (const other of [...shuffled(words, rng), ...shuffled(rest, rng)]) {
        if (distractors.length === OPTION_COUNT - 1) break;
        const m = meaning(other);
        if (other.id === card.id || seen.has(m)) continue;
        seen.add(m);
        distractors.push(other.id);
      }
      return { cardId: card.id, options: shuffled([card.id, ...distractors], rng) };
    });
}
