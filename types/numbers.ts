/** A number and its German word, stored explicitly (the generator in lib/numbers.ts is tested against these). */
export interface NumberWord {
  value: number;
  word: string;
}

export interface CalendarItem {
  id: string;
  de: string;
  en: string;
  fa: string;
}

/** Months, weekdays and seasons. All of them take the article "der". */
export interface CalendarData {
  months: CalendarItem[];
  weekdays: CalendarItem[];
  seasons: CalendarItem[];
}

/** 24-hour clock time. */
export interface ClockTime {
  hour: number;
  minute: number;
}
