import type { ClockTime } from "../types/numbers";

/** Pure German number, clock, price and date words. No data imports: month names are passed in. */

const UNITS = [
  "null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
  "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn",
] as const;

const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"] as const;

export const MAX_CARDINAL = 9999;

function assertInt(n: number, min: number, max: number, what: string): void {
  if (!Number.isInteger(n) || n < min || n > max) throw new RangeError(`${what} must be an integer from ${min} to ${max}, got ${n}`);
}

/** 1..99. Ones come first from 21 on: 21 → "einundzwanzig". A bare 1 is "eins". */
function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const unit = n % 10;
  const ten = TENS[Math.floor(n / 10)];
  if (unit === 0) return ten;
  return `${unit === 1 ? "ein" : UNITS[unit]}und${ten}`;
}

/** Cardinal number 0..9999 as one word: 100 → "hundert", 101 → "hunderteins", 1000 → "tausend". */
export function cardinal(n: number): string {
  assertInt(n, 0, MAX_CARDINAL, "cardinal");
  if (n === 0) return UNITS[0];
  const thousands = Math.floor(n / 1000);
  const hundreds = Math.floor((n % 1000) / 100);
  const tail = n % 100;

  let s = "";
  if (thousands === 1) s += "tausend";
  else if (thousands > 1) s += `${UNITS[thousands]}tausend`;
  if (hundreds === 1) s += thousands > 0 ? "einhundert" : "hundert";
  else if (hundreds > 1) s += `${UNITS[hundreds]}hundert`;
  if (tail > 0) s += below100(tail);
  return s;
}

/** All accepted spellings: "hundert" is also written "einhundert", "tausend" also "eintausend". */
export function cardinalVariants(n: number): string[] {
  const main = cardinal(n);
  const out = [main];
  if (main.startsWith("hundert") || main.startsWith("tausend")) out.push(`ein${main}`);
  return out;
}

/** The stem of an ordinal (no ending): 1 → "erst", 3 → "dritt", 8 → "acht", 21 → "einundzwanzigst". */
export function ordinalStem(n: number): string {
  assertInt(n, 1, 99, "ordinal");
  if (n === 1) return "erst";
  if (n === 3) return "dritt";
  if (n === 7) return "siebt";
  if (n === 8) return "acht";
  return n < 20 ? `${cardinal(n)}t` : `${cardinal(n)}st`;
}

export type OrdinalForm = "nominative" | "dative";

/** "der dritte", "am dritten": the ordinal with its adjective ending (-e after der, -en after am). */
export function ordinal(n: number, form: OrdinalForm = "nominative"): string {
  return ordinalStem(n) + (form === "nominative" ? "e" : "en");
}

// ------------------------------------------------------------------ clock

export function isValidTime({ hour, minute }: ClockTime): boolean {
  return Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function assertTime(time: ClockTime): void {
  if (!isValidTime(time)) throw new RangeError(`invalid time ${time.hour}:${time.minute}`);
}

/** 14:30 → "vierzehn Uhr dreißig". The hour 1 is "ein Uhr", minutes use "eins": 13:01 → "dreizehn Uhr eins". */
export function officialTime(time: ClockTime): string {
  assertTime(time);
  const hour = time.hour === 1 ? "ein" : cardinal(time.hour);
  return time.minute === 0 ? `${hour} Uhr` : `${hour} Uhr ${cardinal(time.minute)}`;
}

const hour12 = (hour: number): number => (hour % 12 === 0 ? 12 : hour % 12);

/**
 * Everyday spoken time in 5-minute steps, 12-hour words. Returns null for other minutes.
 * halb / Viertel vor refer to the NEXT hour: 14:30 → "halb drei", 14:45 → "Viertel vor drei".
 */
export function colloquialVariants(time: ClockTime): string[] | null {
  assertTime(time);
  const { hour, minute } = time;
  if (minute % 5 !== 0) return null;
  const now = cardinal(hour12(hour));
  const next = cardinal(hour12(hour + 1));
  switch (minute) {
    case 0:
      return [`${hour12(hour) === 1 ? "ein" : now} Uhr`];
    case 5:
    case 10:
      return [`${cardinal(minute)} nach ${now}`];
    case 15:
      return [`Viertel nach ${now}`];
    case 20:
      return [`zwanzig nach ${now}`, `zehn vor halb ${next}`];
    case 25:
      return [`fünf vor halb ${next}`];
    case 30:
      return [`halb ${next}`];
    case 35:
      return [`fünf nach halb ${next}`];
    case 40:
      return [`zwanzig vor ${next}`, `zehn nach halb ${next}`];
    case 45:
      return [`Viertel vor ${next}`];
    case 50:
      return [`zehn vor ${next}`];
    default:
      return [`fünf vor ${next}`];
  }
}

export function colloquialTime(time: ClockTime): string | null {
  return colloquialVariants(time)?.[0] ?? null;
}

/** "14:30", "07:05" */
export function formatClock({ hour, minute }: ClockTime): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Hand angles in degrees clockwise from 12 o'clock. The hour hand moves with the minutes. */
export function clockAngles({ hour, minute }: ClockTime): { hour: number; minute: number } {
  return { hour: (hour % 12) * 30 + minute * 0.5, minute: minute * 6 };
}

/** Everyday times repeat after 12 hours, official times need the exact 24-hour value. */
export function sameTime(a: ClockTime, b: ClockTime, style: "official" | "colloquial"): boolean {
  if (a.minute !== b.minute) return false;
  return style === "official" ? a.hour === b.hour : a.hour % 12 === b.hour % 12;
}

// ------------------------------------------------------------------ prices

/** 2,50 € → "zwei Euro fünfzig"; 0,50 € → "fünfzig Cent"; 1,00 € → "ein Euro". */
export function priceWords(euros: number, cents: number): string {
  assertInt(euros, 0, 999, "euros");
  assertInt(cents, 0, 99, "cents");
  if (euros === 0 && cents === 0) return "null Euro";
  if (euros === 0) return `${cents === 1 ? "ein" : cardinal(cents)} Cent`;
  const e = `${euros === 1 ? "ein" : cardinal(euros)} Euro`;
  return cents === 0 ? e : `${e} ${cardinal(cents)}`;
}

/** All accepted spellings of a price, main form first. */
export function priceVariants(euros: number, cents: number): string[] {
  const main = priceWords(euros, cents);
  if (euros === 0 || cents === 0) return [main];
  const e = `${euros === 1 ? "ein" : cardinal(euros)} Euro`;
  const c = cardinal(cents);
  return [main, `${e} ${c} Cent`, `${e} und ${c} Cent`, `${e} und ${c}`];
}

/** "2,50 €" */
export function formatPrice(euros: number, cents: number): string {
  return `${euros},${String(cents).padStart(2, "0")} €`;
}

// ------------------------------------------------------------------ dates

/** Days per month. February is 29 so that every real date can be practised. */
export const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function daysInMonth(month: number): number {
  assertInt(month, 1, 12, "month");
  return DAYS_IN_MONTH[month - 1];
}

export function isValidDate(day: number, month: number): boolean {
  return Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(day) && day >= 1 && day <= daysInMonth(month);
}

/** "3. November" */
export function writtenDate(day: number, monthName: string): string {
  return `${day}. ${monthName}`;
}

/** "der dritte November" */
export function spokenDate(day: number, monthName: string): string {
  return `der ${ordinal(day)} ${monthName}`;
}

/** "am dritten November" */
export function spokenDateOn(day: number, monthName: string): string {
  return `am ${ordinal(day, "dative")} ${monthName}`;
}

/** "Heute ist der dritte November." */
export function todaySentence(day: number, monthName: string): string {
  return `Heute ist ${spokenDate(day, monthName)}.`;
}
