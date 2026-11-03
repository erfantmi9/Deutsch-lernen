/** Calendar days as local "YYYY-MM-DD" keys. Pure; "today" is always passed in by callers. */

export type DateKey = string;

const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number): string => String(n).padStart(2, "0");

/** The local calendar day of a Date. */
export function dateKey(d: Date = new Date()): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string") return false;
  const m = KEY.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

function toUtcDay(key: DateKey): number {
  const m = KEY.exec(key);
  if (!m) throw new Error(`Invalid date key: ${key}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000;
}

function fromUtcDay(day: number): DateKey {
  const d = new Date(day * 86_400_000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: DateKey, days: number): DateKey {
  return fromUtcDay(toUtcDay(key) + days);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: DateKey, to: DateKey): number {
  return toUtcDay(to) - toUtcDay(from);
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (new Date(toUtcDay(key) * 86_400_000).getUTCDay() + 6) % 7;
}
