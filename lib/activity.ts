import { addDays, daysBetween, weekdayIndex } from "./dateKey";
import type { DateKey } from "./dateKey";

/** Learning activity per calendar day: how many answers or finished exercises were recorded. */
export type ActivityDays = Readonly<Record<DateKey, number>>;

/** Older days are dropped so the persisted object stays small. */
export const KEEP_DAYS = 400;

export function bumpActivity(days: ActivityDays, today: DateKey, amount = 1): ActivityDays {
  const next: Record<DateKey, number> = { ...days, [today]: (days[today] ?? 0) + amount };
  for (const key of Object.keys(next)) {
    if (daysBetween(key, today) > KEEP_DAYS) delete next[key];
  }
  return next;
}

/**
 * Consecutive active days ending today. A streak is still alive when today has no activity yet
 * but yesterday had, so it only breaks after a full missed day.
 */
export function currentStreak(days: ActivityDays, today: DateKey): number {
  let cursor = (days[today] ?? 0) > 0 ? today : addDays(today, -1);
  let n = 0;
  while ((days[cursor] ?? 0) > 0) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function longestStreak(days: ActivityDays): number {
  const keys = Object.keys(days)
    .filter((k) => days[k] > 0)
    .sort();
  let best = 0;
  let run = 0;
  let prev: DateKey | null = null;
  for (const key of keys) {
    run = prev !== null && daysBetween(prev, key) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = key;
  }
  return best;
}

export type ActivityLevel = 0 | 1 | 2 | 3;

export interface CalendarCell {
  key: DateKey;
  count: number;
  /** 0 = nothing, 1-3 = light to strong. */
  level: ActivityLevel;
  isToday: boolean;
  isFuture: boolean;
}

export function activityLevel(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count < 10) return 1;
  if (count < 30) return 2;
  return 3;
}

/**
 * Calendar grid of whole weeks (Monday first) ending with the week of `today`.
 * Returns `weeks` columns of 7 cells each.
 */
export function calendarWeeks(days: ActivityDays, today: DateKey, weeks: number): CalendarCell[][] {
  const lastMonday = addDays(today, -weekdayIndex(today));
  const firstMonday = addDays(lastMonday, -7 * (weeks - 1));
  const columns: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(firstMonday, w * 7 + d);
      const count = days[key] ?? 0;
      column.push({
        key,
        count,
        level: activityLevel(count),
        isToday: key === today,
        isFuture: daysBetween(today, key) > 0,
      });
    }
    columns.push(column);
  }
  return columns;
}

export function activeDayCount(days: ActivityDays): number {
  return Object.values(days).filter((n) => n > 0).length;
}
