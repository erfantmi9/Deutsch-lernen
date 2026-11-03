import { z } from "zod";
import type { CalendarData, CalendarItem, NumberWord } from "../../types/numbers";
import { TextSchema } from "./common";

export const NumberWordSchema = z.object({
  value: z.number().int().nonnegative(),
  word: TextSchema,
}) satisfies z.ZodType<NumberWord>;

function uniqueValues(list: readonly NumberWord[], ctx: z.RefinementCtx): void {
  const seen = new Set<number>();
  list.forEach((e, i) => {
    if (seen.has(e.value)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `duplicate value ${e.value}` });
    seen.add(e.value);
  });
}

export const CardinalListSchema = z.array(NumberWordSchema).min(1).superRefine(uniqueValues);

export const OrdinalListSchema = z
  .array(NumberWordSchema)
  .length(31)
  .superRefine((list, ctx) => {
    uniqueValues(list, ctx);
    list.forEach((e, i) => {
      if (e.value !== i + 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `expected ordinal ${i + 1}, got ${e.value}` });
    });
  });

export const CalendarItemSchema = z.object({
  id: TextSchema,
  de: TextSchema,
  en: TextSchema,
  fa: TextSchema,
}) satisfies z.ZodType<CalendarItem>;

function uniqueIds(list: readonly CalendarItem[], ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  list.forEach((e, i) => {
    if (seen.has(e.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `duplicate id "${e.id}"` });
    seen.add(e.id);
  });
}

export const CalendarSchema = z.object({
  months: z.array(CalendarItemSchema).length(12).superRefine(uniqueIds),
  weekdays: z.array(CalendarItemSchema).length(7).superRefine(uniqueIds),
  seasons: z.array(CalendarItemSchema).length(4).superRefine(uniqueIds),
}) satisfies z.ZodType<CalendarData>;
