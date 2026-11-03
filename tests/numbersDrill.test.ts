import { describe, expect, it } from "vitest";
import {
  accuracy,
  applyNumbersResult,
  checkNumberAnswer,
  checkQuestion,
  compact,
  EMPTY_NUMBERS_STATS,
  expectedAnswer,
  makeQuestion,
  NUMBER_DRILL_KINDS,
  numbersProgress,
  shiftTime,
  totalCorrect,
} from "../lib/numbersDrill";
import type { NumberQuestion } from "../lib/numbersDrill";
import { colloquialTime, officialTime } from "../lib/numbers";

/** Deterministic pseudo-random sequence so the tests do not flake. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("makeQuestion", () => {
  it("creates a question of the requested kind", () => {
    for (const kind of NUMBER_DRILL_KINDS) expect(makeQuestion(kind, seeded(1)).kind).toBe(kind);
  });
  it("always creates answerable questions (500 random questions per kind)", () => {
    const rng = seeded(42);
    for (const kind of NUMBER_DRILL_KINDS) {
      for (let i = 0; i < 500; i++) {
        const q = makeQuestion(kind, rng);
        expect(expectedAnswer(q).length).toBeGreaterThan(0);
        if (q.kind === "clock-read") {
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect(q.options).toContain(q.answer);
        }
        if (q.kind === "price") expect(q.euros + q.cents).toBeGreaterThan(0);
      }
    }
  });
  it("keeps numbers in range", () => {
    const rng = seeded(7);
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion("cardinal", rng);
      if (q.kind === "cardinal") expect(q.n === 1000 || (q.n >= 0 && q.n <= 100)).toBe(true);
    }
  });
  it("only asks for five-minute times when reading the clock and for matching phrases when setting it", () => {
    const rng = seeded(9);
    for (let i = 0; i < 300; i++) {
      const read = makeQuestion("clock-read", rng);
      if (read.kind === "clock-read") expect(read.time.minute % 5).toBe(0);
      const set = makeQuestion("clock-set", rng);
      if (set.kind === "clock-set") {
        expect(set.phrase).toBe(set.style === "official" ? officialTime(set.time) : colloquialTime(set.time));
      }
    }
  });
  it("generates valid dates", () => {
    const rng = seeded(3);
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion("date", rng);
      if (q.kind === "date") {
        expect(q.accepted[0]).toMatch(/^der \p{L}+e \p{L}+$/u);
        expect(q.accepted[1]).toBe(q.accepted[0].slice(4));
      }
    }
  });
  it("shifts times across midnight", () => {
    expect(shiftTime({ hour: 23, minute: 50 }, 20)).toEqual({ hour: 0, minute: 10 });
    expect(shiftTime({ hour: 0, minute: 5 }, -10)).toEqual({ hour: 23, minute: 55 });
    expect(shiftTime({ hour: 10, minute: 0 }, 0)).toEqual({ hour: 10, minute: 0 });
  });
});

const cardinalQ: NumberQuestion = { kind: "cardinal", n: 16, accepted: ["sechzehn"] };
const hundredQ: NumberQuestion = { kind: "cardinal", n: 100, accepted: ["hundert", "einhundert"] };
const priceQ: NumberQuestion = {
  kind: "price",
  euros: 2,
  cents: 50,
  accepted: ["zwei Euro fünfzig", "zwei Euro fünfzig Cent", "zwei Euro und fünfzig Cent", "zwei Euro und fünfzig"],
};
const dateQ: NumberQuestion = { kind: "date", day: 3, month: 11, accepted: ["der dritte November", "dritte November"] };

describe("checkQuestion: typed answers", () => {
  it("accepts correct answers ignoring case, spaces and hyphens", () => {
    expect(checkQuestion(cardinalQ, "Sechzehn").correct).toBe(true);
    expect(checkQuestion(cardinalQ, "  sechzehn ").correct).toBe(true);
    expect(checkQuestion(cardinalQ, "sech-zehn").correct).toBe(true);
    expect(checkQuestion(hundredQ, "einhundert").correct).toBe(true);
    expect(checkQuestion(priceQ, "zwei Euro und fünfzig Cent").correct).toBe(true);
    expect(checkQuestion(priceQ, "Zwei  Euro fünfzig").correct).toBe(true);
    expect(checkQuestion(dateQ, "Der dritte November").correct).toBe(true);
    expect(checkQuestion(dateQ, "dritte November").correct).toBe(true);
  });
  it("is strict about umlauts and flags umlaut-only mistakes", () => {
    const f = checkQuestion({ kind: "cardinal", n: 5, accepted: ["fünf"] }, "funf");
    expect(f).toMatchObject({ correct: false, umlaut: true, expected: "fünf" });
    expect(checkQuestion({ kind: "cardinal", n: 30, accepted: ["dreißig"] }, "dreissig")).toMatchObject({ correct: false, umlaut: true });
    expect(checkQuestion({ kind: "cardinal", n: 5, accepted: ["fünf"] }, "fuenf")).toMatchObject({ correct: false, umlaut: false });
  });
  it("rejects wrong answers and empty input", () => {
    expect(checkQuestion(cardinalQ, "siebzehn")).toMatchObject({ correct: false, umlaut: false, expected: "sechzehn" });
    expect(checkQuestion(cardinalQ, "")).toMatchObject({ correct: false });
    expect(checkQuestion(dateQ, "der dreizehnte November").correct).toBe(false);
    expect(checkQuestion(priceQ, "zwei Euro").correct).toBe(false);
  });
  it("compact removes whitespace, hyphens and case", () => {
    expect(compact(" Ein-Und Zwanzig ")).toBe("einundzwanzig");
    expect(checkNumberAnswer("EINUNDZWANZIG", ["einundzwanzig"])).toBe("correct");
  });
});

describe("checkQuestion: other kinds", () => {
  it("reverse: accepts digits with spaces or dots, rejects text", () => {
    const q: NumberQuestion = { kind: "reverse", n: 1000, words: "tausend" };
    expect(checkQuestion(q, "1000").correct).toBe(true);
    expect(checkQuestion(q, "1.000").correct).toBe(true);
    expect(checkQuestion(q, " 1 000 ").correct).toBe(true);
    expect(checkQuestion(q, "999").correct).toBe(false);
    expect(checkQuestion(q, "tausend").correct).toBe(false);
    expect(checkQuestion(q, "").correct).toBe(false);
    expect(expectedAnswer(q)).toBe("1000");
  });
  it("clock-read: compares the chosen option", () => {
    const q: NumberQuestion = { kind: "clock-read", time: { hour: 14, minute: 30 }, answer: "halb drei", options: ["halb drei", "halb vier", "Viertel vor drei", "zwanzig nach drei"] };
    expect(checkQuestion(q, "halb drei").correct).toBe(true);
    expect(checkQuestion(q, "halb vier").correct).toBe(false);
    expect(checkQuestion(q, { hour: 14, minute: 30 }).correct).toBe(false);
  });
  it("clock-set: official needs 24h, everyday accepts the 12h clock", () => {
    const official: NumberQuestion = { kind: "clock-set", time: { hour: 14, minute: 30 }, style: "official", phrase: "vierzehn Uhr dreißig" };
    expect(checkQuestion(official, { hour: 14, minute: 30 }).correct).toBe(true);
    expect(checkQuestion(official, { hour: 2, minute: 30 }).correct).toBe(false);
    expect(checkQuestion(official, "14:30").correct).toBe(false);
    expect(expectedAnswer(official)).toBe("14:30");

    const everyday: NumberQuestion = { kind: "clock-set", time: { hour: 14, minute: 30 }, style: "colloquial", phrase: "halb drei" };
    expect(checkQuestion(everyday, { hour: 2, minute: 30 }).correct).toBe(true);
    expect(checkQuestion(everyday, { hour: 14, minute: 30 }).correct).toBe(true);
    expect(checkQuestion(everyday, { hour: 3, minute: 30 }).correct).toBe(false);
  });
});

describe("numbers progress", () => {
  it("tracks attempts, correct answers, streaks per kind", () => {
    let s = applyNumbersResult(EMPTY_NUMBERS_STATS, "cardinal", true);
    s = applyNumbersResult(s, "cardinal", true);
    s = applyNumbersResult(s, "price", false);
    expect(s.byKind.cardinal).toEqual({ attempts: 2, correct: 2 });
    expect(s.byKind.price).toEqual({ attempts: 1, correct: 0 });
    expect(s).toMatchObject({ streak: 0, bestStreak: 2 });
    expect(totalCorrect(s)).toBe(2);
    expect(accuracy(s, "cardinal")).toBe(1);
    expect(accuracy(s, "price")).toBe(0);
    expect(accuracy(s, "date")).toBe(0);
  });
  it("does not mutate and tolerates stored data without a kind", () => {
    const before = applyNumbersResult(EMPTY_NUMBERS_STATS, "date", true);
    const snapshot = JSON.stringify(before);
    applyNumbersResult(before, "date", false);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(JSON.stringify(EMPTY_NUMBERS_STATS)).not.toContain('"attempts":1');

    const partial = { byKind: { cardinal: { attempts: 1, correct: 1 } }, streak: 1, bestStreak: 1 } as unknown as typeof EMPTY_NUMBERS_STATS;
    const next = applyNumbersResult(partial, "reverse", true);
    expect(next.byKind["clock-set"]).toEqual({ attempts: 0, correct: 0 });
    expect(totalCorrect(partial)).toBe(1);
  });
  it("caps progress at 1", () => {
    let s = EMPTY_NUMBERS_STATS;
    expect(numbersProgress(s)).toBe(0);
    for (let i = 0; i < 90; i++) s = applyNumbersResult(s, "cardinal", true);
    expect(numbersProgress(s)).toBe(1);
    expect(numbersProgress(applyNumbersResult(EMPTY_NUMBERS_STATS, "date", true), 4)).toBe(0.25);
  });
});

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe("numbers UI messages", () => {
  it("has the same Numbers keys in en, fa and de", async () => {
    const [en, fa, de] = await Promise.all([
      import("../messages/en.json"),
      import("../messages/fa.json"),
      import("../messages/de.json"),
    ]);
    const base = keyPaths(en.default.Numbers).sort();
    expect(keyPaths(fa.default.Numbers).sort()).toEqual(base);
    expect(keyPaths(de.default.Numbers).sort()).toEqual(base);
    for (const m of [en.default, fa.default, de.default]) {
      expect(m.Home.modules.numbers.title).toBeTruthy();
      for (const kind of NUMBER_DRILL_KINDS) {
        expect((m.Numbers.practice.kinds as Record<string, string>)[kind]).toBeTruthy();
        expect((m.Numbers.practice.prompts as Record<string, string>)[kind]).toBeTruthy();
      }
    }
  });
});
