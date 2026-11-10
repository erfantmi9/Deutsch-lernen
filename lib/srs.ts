import { addDays, daysBetween } from "./dateKey";
import type { DateKey } from "./dateKey";

/**
 * Spaced repetition with the SM-2 algorithm (Piotr Wozniak, 1987), pure and day-based.
 *
 * The four answer buttons map to SM-2 quality grades: again = 1, hard = 3, good = 4, easy = 5.
 * Quality below 3 is a lapse: repetitions restart and the card comes back the next day.
 *
 * Intervals differ by answer (as in Anki), so the buttons always mean something different:
 * - a new card: hard 1 day, good 2 days, easy 4 days;
 * - the second pass: good at least 6 days (or interval x ease), hard about half of that, easy x 1.3;
 * - later: good = interval x ease, hard = interval x 1.2, easy = interval x ease x 1.3.
 * Hard < good < easy always, and every pass grows the interval by at least a day. Ease never drops below 1.3.
 */

export type Grade = "again" | "hard" | "good" | "easy";
export const GRADES: readonly Grade[] = ["again", "hard", "good", "easy"];

export const QUALITY: Readonly<Record<Grade, number>> = { again: 1, hard: 3, good: 4, easy: 5 };

export const START_EASE = 2.5;
/** First interval of a new (or lapsed) card per answer, in days. */
export const FIRST_INTERVALS: Readonly<Record<Exclude<Grade, "again">, number>> = { hard: 1, good: 2, easy: 4 };
const HARD_FACTOR = 1.2;
const EASY_BONUS = 1.3;
export const MIN_EASE = 1.3;
/** An interval of at least this many days counts as a "mature" (well learned) card. */
export const MATURE_DAYS = 21;
export const DEFAULT_NEW_PER_DAY = 10;
export const MAX_NEW_PER_DAY = 100;

export interface SrsCard {
  /** Card id, e.g. "noun:kopf" (see lib/reviewCards.ts). */
  id: string;
  /** SM-2 easiness factor. */
  ease: number;
  /** Days until the next review, as of the last review. */
  interval: number;
  /** Successful reviews in a row. */
  reps: number;
  lapses: number;
  /** Day the card is next due. */
  due: DateKey;
  /** Day the card was added to the review deck. */
  added: DateKey;
  /** Day of the last review; absent until the first one. */
  last?: DateKey;
}

export function newCard(id: string, today: DateKey): SrsCard {
  return { id, ease: START_EASE, interval: 0, reps: 0, lapses: 0, due: today, added: today };
}

export const isNew = (card: SrsCard): boolean => card.last === undefined;

export function isDue(card: SrsCard, today: DateKey): boolean {
  return card.due <= today;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** SM-2 ease update: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)), never below 1.3. */
export function nextEase(ease: number, quality: number): number {
  const q = 5 - quality;
  return round2(Math.max(MIN_EASE, ease + (0.1 - q * (0.08 + q * 0.02))));
}

/** Applies one answer. Returns a new card; the input is not changed. */
export function review(card: SrsCard, grade: Grade, today: DateKey): SrsCard {
  const quality = QUALITY[grade];
  const ease = nextEase(card.ease, quality);

  if (quality < 3) {
    return { ...card, ease, interval: 1, reps: 0, lapses: card.lapses + 1, due: addDays(today, 1), last: today };
  }

  const reps = card.reps + 1;
  const interval = passIntervals(card)[grade as Exclude<Grade, "again">];
  return { ...card, ease, interval, reps, due: addDays(today, interval), last: today };
}

/** Interval for each passing answer; strictly increasing from hard to easy. */
function passIntervals(card: SrsCard): Record<Exclude<Grade, "again">, number> {
  if (card.reps === 0) return { ...FIRST_INTERVALS };
  const i = Math.max(1, card.interval);
  const goodEase = nextEase(card.ease, QUALITY.good);
  const easyEase = nextEase(card.ease, QUALITY.easy);
  const second = card.reps === 1;
  // good is at least 2 days longer, so hard (at least 1 day longer) always fits between the interval and good.
  const good = Math.max(i + 2, second ? 6 : 0, Math.round(i * goodEase));
  const hard = Math.min(good - 1, Math.max(i + 1, second ? Math.round(good / 2) : Math.round(i * HARD_FACTOR)));
  const easy = Math.max(good + 1, Math.round((second ? good : i * easyEase) * EASY_BONUS));
  return { hard: Math.max(1, hard), good, easy };
}

/** Days until the next review if `grade` were chosen now (for the button labels). */
export function previewInterval(card: SrsCard, grade: Grade, today: DateKey): number {
  return review(card, grade, today).interval;
}

export interface DailyLog {
  /** Answers given. */
  reviews: number;
  /** Cards answered for the first time. */
  newCards: number;
}

export type ReviewLog = Readonly<Record<DateKey, DailyLog>>;

export function recordInLog(log: ReviewLog, today: DateKey, wasNew: boolean): ReviewLog {
  const prev = log[today] ?? { reviews: 0, newCards: 0 };
  return { ...log, [today]: { reviews: prev.reviews + 1, newCards: prev.newCards + (wasNew ? 1 : 0) } };
}

export interface QueueOptions {
  today: DateKey;
  newPerDay: number;
  /** New cards already answered today, so reopening the page does not hand out more. */
  newDoneToday: number;
}

export interface Queue {
  /** Overdue and due cards, most overdue first, then the day's new cards. */
  ids: string[];
  dueCount: number;
  newCount: number;
  /** New cards still waiting after today's allowance is used. */
  newBacklog: number;
}

export function buildQueue(cards: Readonly<Record<string, SrsCard>>, options: QueueOptions): Queue {
  const all = Object.values(cards);
  const due = all
    .filter((c) => !isNew(c) && isDue(c, options.today))
    .sort((a, b) => (a.due === b.due ? a.id.localeCompare(b.id) : a.due < b.due ? -1 : 1));
  const fresh = all
    .filter(isNew)
    .sort((a, b) => (a.added === b.added ? a.id.localeCompare(b.id) : a.added < b.added ? -1 : 1));
  const allowance = Math.max(0, options.newPerDay - options.newDoneToday);
  const todaysNew = fresh.slice(0, allowance);
  return {
    ids: [...due.map((c) => c.id), ...todaysNew.map((c) => c.id)],
    dueCount: due.length,
    newCount: todaysNew.length,
    newBacklog: fresh.length - todaysNew.length,
  };
}

/** After an "again" the card is shown once more at the end of the same session. */
export function requeueAfterAgain(
  queue: readonly string[],
  index: number,
  grade: Grade,
  alreadyRepeated: ReadonlySet<string>,
): string[] {
  const id = queue[index];
  if (grade !== "again" || id === undefined || alreadyRepeated.has(id)) return [...queue];
  return [...queue, id];
}

export interface DeckStats {
  total: number;
  /** Not answered yet. */
  fresh: number;
  /** Answered, interval below MATURE_DAYS. */
  learning: number;
  mature: number;
  dueToday: number;
}

export function deckStats(cards: Readonly<Record<string, SrsCard>>, today: DateKey): DeckStats {
  const all = Object.values(cards);
  const fresh = all.filter(isNew).length;
  const mature = all.filter((c) => !isNew(c) && c.interval >= MATURE_DAYS).length;
  return {
    total: all.length,
    fresh,
    learning: all.length - fresh - mature,
    mature,
    dueToday: all.filter((c) => !isNew(c) && isDue(c, today)).length,
  };
}

/** Review cards with the most lapses first: the words that do not stick. */
export function hardestCards(cards: Readonly<Record<string, SrsCard>>, limit: number): SrsCard[] {
  return Object.values(cards)
    .filter((c) => c.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || a.ease - b.ease || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function overdueDays(card: SrsCard, today: DateKey): number {
  return Math.max(0, daysBetween(card.due, today));
}

export function clampNewPerDay(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_NEW_PER_DAY;
  return Math.min(MAX_NEW_PER_DAY, Math.max(0, Math.round(n)));
}
