import { describe, expect, it } from "vitest";
import {
  cardinal,
  cardinalVariants,
  clockAngles,
  colloquialTime,
  colloquialVariants,
  daysInMonth,
  formatClock,
  formatPrice,
  isValidDate,
  isValidTime,
  officialTime,
  ordinal,
  ordinalStem,
  priceVariants,
  priceWords,
  sameTime,
  spokenDate,
  spokenDateOn,
  todaySentence,
  writtenDate,
} from "../lib/numbers";
import { calendar, cardinalWords, monthName, ordinalWords } from "../lib/numbersData";
import { CalendarSchema, CardinalListSchema, OrdinalListSchema } from "../lib/schemas/numbers";

const t = (hour: number, minute: number) => ({ hour, minute });

describe("cardinal", () => {
  it("matches the hand-written reference list for 0-100 and 1000", () => {
    for (const { value, word } of cardinalWords) expect(cardinal(value), String(value)).toBe(word);
  });
  it("handles the tricky cases", () => {
    expect(cardinal(21)).toBe("einundzwanzig");
    expect(cardinal(31)).toBe("einunddreißig");
    expect(cardinal(100)).toBe("hundert");
    expect(cardinal(16)).toBe("sechzehn");
    expect(cardinal(17)).toBe("siebzehn");
    expect(cardinal(60)).toBe("sechzig");
    expect(cardinal(70)).toBe("siebzig");
    expect(cardinal(30)).toBe("dreißig");
    expect(cardinal(1)).toBe("eins");
    expect(cardinal(0)).toBe("null");
  });
  it("builds hundreds and thousands", () => {
    expect(cardinal(101)).toBe("hunderteins");
    expect(cardinal(200)).toBe("zweihundert");
    expect(cardinal(321)).toBe("dreihunderteinundzwanzig");
    expect(cardinal(999)).toBe("neunhundertneunundneunzig");
    expect(cardinal(1000)).toBe("tausend");
    expect(cardinal(1001)).toBe("tausendeins");
    expect(cardinal(1100)).toBe("tausendeinhundert");
    expect(cardinal(2024)).toBe("zweitausendvierundzwanzig");
    expect(cardinal(9999)).toBe("neuntausendneunhundertneunundneunzig");
  });
  it("rejects values outside 0-9999 and non-integers", () => {
    expect(() => cardinal(-1)).toThrow(RangeError);
    expect(() => cardinal(10000)).toThrow(RangeError);
    expect(() => cardinal(1.5)).toThrow(RangeError);
    expect(() => cardinal(Number.NaN)).toThrow(RangeError);
  });
  it("accepts einhundert and eintausend as variants", () => {
    expect(cardinalVariants(100)).toEqual(["hundert", "einhundert"]);
    expect(cardinalVariants(1000)).toEqual(["tausend", "eintausend"]);
    expect(cardinalVariants(21)).toEqual(["einundzwanzig"]);
  });
});

describe("ordinal", () => {
  it("matches the hand-written reference list for 1-31", () => {
    for (const { value, word } of ordinalWords) expect(ordinal(value), String(value)).toBe(word);
  });
  it("knows the irregular ones", () => {
    expect(ordinalStem(1)).toBe("erst");
    expect(ordinalStem(3)).toBe("dritt");
    expect(ordinalStem(7)).toBe("siebt");
    expect(ordinalStem(8)).toBe("acht");
    expect(ordinalStem(20)).toBe("zwanzigst");
  });
  it("adds -en after am", () => {
    expect(ordinal(3, "dative")).toBe("dritten");
    expect(ordinal(1, "dative")).toBe("ersten");
    expect(ordinal(31, "dative")).toBe("einunddreißigsten");
  });
  it("rejects 0 and non-integers", () => {
    expect(() => ordinal(0)).toThrow(RangeError);
    expect(() => ordinal(2.5)).toThrow(RangeError);
  });
});

describe("official time", () => {
  it("14:30 → vierzehn Uhr dreißig", () => {
    expect(officialTime(t(14, 30))).toBe("vierzehn Uhr dreißig");
  });
  it("handles whole hours, midnight, hour 1 and minute 1", () => {
    expect(officialTime(t(13, 0))).toBe("dreizehn Uhr");
    expect(officialTime(t(0, 0))).toBe("null Uhr");
    expect(officialTime(t(1, 0))).toBe("ein Uhr");
    expect(officialTime(t(21, 0))).toBe("einundzwanzig Uhr");
    expect(officialTime(t(13, 1))).toBe("dreizehn Uhr eins");
    expect(officialTime(t(0, 5))).toBe("null Uhr fünf");
    expect(officialTime(t(23, 59))).toBe("dreiundzwanzig Uhr neunundfünfzig");
    expect(officialTime(t(17, 16))).toBe("siebzehn Uhr sechzehn");
    expect(officialTime(t(7, 17))).toBe("sieben Uhr siebzehn");
  });
  it("rejects invalid times", () => {
    expect(() => officialTime(t(24, 0))).toThrow(RangeError);
    expect(() => officialTime(t(10, 60))).toThrow(RangeError);
    expect(isValidTime(t(23, 59))).toBe(true);
    expect(isValidTime(t(-1, 0))).toBe(false);
  });
});

describe("colloquial time", () => {
  it("14:30 → halb drei", () => {
    expect(colloquialTime(t(14, 30))).toBe("halb drei");
  });
  it("Viertel nach and Viertel vor", () => {
    expect(colloquialTime(t(9, 15))).toBe("Viertel nach neun");
    expect(colloquialTime(t(15, 45))).toBe("Viertel vor vier");
  });
  it("uses the 12-hour clock and eins/ein correctly", () => {
    expect(colloquialTime(t(13, 0))).toBe("ein Uhr");
    expect(colloquialTime(t(12, 0))).toBe("zwölf Uhr");
    expect(colloquialTime(t(0, 0))).toBe("zwölf Uhr");
    expect(colloquialTime(t(12, 30))).toBe("halb eins");
    expect(colloquialTime(t(0, 30))).toBe("halb eins");
    expect(colloquialTime(t(13, 15))).toBe("Viertel nach eins");
    expect(colloquialTime(t(23, 45))).toBe("Viertel vor zwölf");
    expect(colloquialTime(t(11, 30))).toBe("halb zwölf");
  });
  it("covers all five-minute steps", () => {
    expect(colloquialTime(t(7, 5))).toBe("fünf nach sieben");
    expect(colloquialTime(t(7, 10))).toBe("zehn nach sieben");
    expect(colloquialTime(t(7, 20))).toBe("zwanzig nach sieben");
    expect(colloquialTime(t(7, 25))).toBe("fünf vor halb acht");
    expect(colloquialTime(t(7, 35))).toBe("fünf nach halb acht");
    expect(colloquialTime(t(7, 40))).toBe("zwanzig vor acht");
    expect(colloquialTime(t(7, 50))).toBe("zehn vor acht");
    expect(colloquialTime(t(7, 55))).toBe("fünf vor acht");
  });
  it("offers the alternative forms for :20 and :40", () => {
    expect(colloquialVariants(t(15, 20))).toEqual(["zwanzig nach drei", "zehn vor halb vier"]);
    expect(colloquialVariants(t(15, 40))).toEqual(["zwanzig vor vier", "zehn nach halb vier"]);
  });
  it("returns null for minutes that are not multiples of five", () => {
    expect(colloquialTime(t(10, 7))).toBeNull();
    expect(colloquialVariants(t(10, 59))).toBeNull();
  });
});

describe("clock helpers", () => {
  it("formats clock times", () => {
    expect(formatClock(t(7, 5))).toBe("07:05");
    expect(formatClock(t(14, 30))).toBe("14:30");
  });
  it("computes hand angles, the hour hand moves with the minutes", () => {
    expect(clockAngles(t(3, 0))).toEqual({ hour: 90, minute: 0 });
    expect(clockAngles(t(6, 30))).toEqual({ hour: 195, minute: 180 });
    expect(clockAngles(t(0, 0))).toEqual({ hour: 0, minute: 0 });
    expect(clockAngles(t(15, 15))).toEqual({ hour: 97.5, minute: 90 });
  });
  it("compares times: official needs 24h, everyday repeats after 12h", () => {
    expect(sameTime(t(14, 30), t(2, 30), "colloquial")).toBe(true);
    expect(sameTime(t(14, 30), t(2, 30), "official")).toBe(false);
    expect(sameTime(t(14, 30), t(14, 30), "official")).toBe(true);
    expect(sameTime(t(14, 30), t(14, 35), "colloquial")).toBe(false);
    expect(sameTime(t(0, 0), t(12, 0), "colloquial")).toBe(true);
  });
});

describe("prices", () => {
  it("2,50 € → zwei Euro fünfzig", () => {
    expect(priceWords(2, 50)).toBe("zwei Euro fünfzig");
    expect(formatPrice(2, 50)).toBe("2,50 €");
  });
  it("handles whole euros, cents only, one euro, one cent and zero", () => {
    expect(priceWords(5, 0)).toBe("fünf Euro");
    expect(priceWords(1, 0)).toBe("ein Euro");
    expect(priceWords(0, 50)).toBe("fünfzig Cent");
    expect(priceWords(0, 1)).toBe("ein Cent");
    expect(priceWords(1, 1)).toBe("ein Euro eins");
    expect(priceWords(21, 99)).toBe("einundzwanzig Euro neunundneunzig");
    expect(priceWords(0, 0)).toBe("null Euro");
    expect(formatPrice(0, 5)).toBe("0,05 €");
  });
  it("accepts the spoken variants", () => {
    expect(priceVariants(2, 50)).toEqual([
      "zwei Euro fünfzig",
      "zwei Euro fünfzig Cent",
      "zwei Euro und fünfzig Cent",
      "zwei Euro und fünfzig",
    ]);
    expect(priceVariants(3, 0)).toEqual(["drei Euro"]);
  });
  it("rejects out-of-range amounts", () => {
    expect(() => priceWords(-1, 0)).toThrow(RangeError);
    expect(() => priceWords(1, 100)).toThrow(RangeError);
    expect(() => priceWords(1000, 0)).toThrow(RangeError);
  });
});

describe("dates", () => {
  it("Heute ist der 3. November", () => {
    expect(writtenDate(3, "November")).toBe("3. November");
    expect(spokenDate(3, "November")).toBe("der dritte November");
    expect(spokenDateOn(3, "November")).toBe("am dritten November");
    expect(todaySentence(3, "November")).toBe("Heute ist der dritte November.");
  });
  it("handles the first, seventh and last days", () => {
    expect(spokenDate(1, "Januar")).toBe("der erste Januar");
    expect(spokenDate(7, "Juli")).toBe("der siebte Juli");
    expect(spokenDate(31, "Dezember")).toBe("der einunddreißigste Dezember");
    expect(spokenDateOn(20, "März")).toBe("am zwanzigsten März");
  });
  it("knows the days per month and validates dates", () => {
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(12)).toBe(31);
    expect(isValidDate(31, 4)).toBe(false);
    expect(isValidDate(29, 2)).toBe(true);
    expect(isValidDate(30, 2)).toBe(false);
    expect(isValidDate(1, 13)).toBe(false);
    expect(() => daysInMonth(0)).toThrow(RangeError);
  });
});

describe("shipped number data", () => {
  it("passes its schemas", () => {
    expect(CardinalListSchema.safeParse(cardinalWords).success).toBe(true);
    expect(OrdinalListSchema.safeParse(ordinalWords).success).toBe(true);
    expect(CalendarSchema.safeParse(calendar).success).toBe(true);
  });
  it("has every number from 0 to 100 plus 1000", () => {
    const values = cardinalWords.map((c) => c.value);
    expect(values).toEqual([...Array.from({ length: 101 }, (_, i) => i), 1000]);
  });
  it("lists the calendar in the right order", () => {
    expect(calendar.months.map((m) => m.de)[10]).toBe("November");
    expect(calendar.weekdays[0].de).toBe("Montag");
    expect(calendar.weekdays[6].de).toBe("Sonntag");
    expect(calendar.seasons.map((s) => s.de)).toEqual(["Frühling", "Sommer", "Herbst", "Winter"]);
    expect(monthName(3)).toBe("März");
    expect(() => monthName(13)).toThrow(RangeError);
  });
  it("rejects bad data in the schemas", () => {
    expect(CardinalListSchema.safeParse([{ value: 1, word: "eins" }, { value: 1, word: "ein" }]).success).toBe(false);
    expect(OrdinalListSchema.safeParse(ordinalWords.slice(0, 30)).success).toBe(false);
    expect(CalendarSchema.safeParse({ ...calendar, months: calendar.months.slice(0, 11) }).success).toBe(false);
  });
});
