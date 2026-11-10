import { z } from "zod";
import { isDateKey } from "./dateKey";
import type { DateKey } from "./dateKey";
import { clampNewPerDay, DEFAULT_NEW_PER_DAY, MIN_EASE } from "./srs";
import type { ReviewLog, SrsCard } from "./srs";

/** Persisted spaced-repetition state: validation, migration and merging (account sync). */

export const SRS_STATE_VERSION = 1;

export interface SrsState {
  cards: Record<string, SrsCard>;
  log: ReviewLog;
  newPerDay: number;
}

export const emptySrsState = (): SrsState => ({ cards: {}, log: {}, newPerDay: DEFAULT_NEW_PER_DAY });

const DateKeySchema = z.string().refine(isDateKey, { message: "not a valid date (YYYY-MM-DD)" });

export const SrsCardSchema = z.object({
  id: z.string().min(1),
  ease: z.number().min(MIN_EASE).max(5),
  interval: z.number().int().min(0).max(36500),
  reps: z.number().int().min(0),
  lapses: z.number().int().min(0),
  due: DateKeySchema,
  added: DateKeySchema,
  last: DateKeySchema.optional(),
}) satisfies z.ZodType<SrsCard>;

const DailyLogSchema = z.object({ reviews: z.number().int().min(0), newCards: z.number().int().min(0) });

const lastOf = (c: SrsCard): DateKey => c.last ?? "";

/** The card that has been reviewed more recently wins; on a tie the one with more repetitions. */
function newerCard(a: SrsCard, b: SrsCard): SrsCard {
  if (lastOf(a) !== lastOf(b)) return lastOf(a) > lastOf(b) ? a : b;
  return a.reps >= b.reps ? a : b;
}

/** Combines two decks: the union of cards, the newer progress per card, the larger daily counts. */
export function mergeSrsStates(current: SrsState, incoming: SrsState): SrsState {
  const cards: Record<string, SrsCard> = { ...current.cards };
  for (const card of Object.values(incoming.cards)) {
    const mine = cards[card.id];
    cards[card.id] = mine ? newerCard(mine, card) : card;
  }
  const log: Record<DateKey, { reviews: number; newCards: number }> = { ...current.log };
  for (const [day, entry] of Object.entries(incoming.log)) {
    const mine = log[day];
    log[day] = mine
      ? { reviews: Math.max(mine.reviews, entry.reviews), newCards: Math.max(mine.newCards, entry.newCards) }
      : entry;
  }
  return { cards, log, newPerDay: current.newPerDay };
}

/** Keeps only valid parts of whatever was found in storage. */
export function sanitizeSrsState(value: unknown): SrsState {
  const base = emptySrsState();
  if (typeof value !== "object" || value === null) return base;
  const v = value as { cards?: unknown; log?: unknown; newPerDay?: unknown };

  if (typeof v.cards === "object" && v.cards !== null) {
    for (const candidate of Object.values(v.cards)) {
      const parsed = SrsCardSchema.safeParse(candidate);
      if (parsed.success) base.cards[parsed.data.id] = parsed.data;
    }
  }
  if (typeof v.log === "object" && v.log !== null) {
    const log: Record<DateKey, { reviews: number; newCards: number }> = {};
    for (const [day, entry] of Object.entries(v.log)) {
      const parsed = DailyLogSchema.safeParse(entry);
      if (isDateKey(day) && parsed.success) log[day] = parsed.data;
    }
    base.log = log;
  }
  if (typeof v.newPerDay === "number") base.newPerDay = clampNewPerDay(v.newPerDay);
  return base;
}

/**
 * zustand `migrate` hook. Version 1 is the first shape; unknown or older data is sanitized
 * instead of dropped. Add a `version < n` step here when the shape changes.
 */
export function migrateSrs(persisted: unknown, version: number): SrsState {
  void version;
  return sanitizeSrsState(persisted);
}
