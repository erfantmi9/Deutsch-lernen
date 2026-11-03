import calendarRaw from "../data/numbers/calendar.json";
import cardinalsRaw from "../data/numbers/cardinals.json";
import ordinalsRaw from "../data/numbers/ordinals.json";
import { CalendarSchema, CardinalListSchema, OrdinalListSchema } from "./schemas/numbers";
import type { CalendarData, NumberWord } from "../types/numbers";

// Validated once at module load; throws a ZodError on malformed data.
export const cardinalWords: readonly NumberWord[] = CardinalListSchema.parse(cardinalsRaw);
export const ordinalWords: readonly NumberWord[] = OrdinalListSchema.parse(ordinalsRaw);
export const calendar: CalendarData = CalendarSchema.parse(calendarRaw);

/** German month name for months 1..12. */
export function monthName(month: number): string {
  const m = calendar.months[month - 1];
  if (!m) throw new RangeError(`month must be 1-12, got ${month}`);
  return m.de;
}
