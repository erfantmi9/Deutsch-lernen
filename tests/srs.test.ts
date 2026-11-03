import { describe, expect, it } from "vitest";
import { addDays, dateKey, daysBetween, isDateKey, weekdayIndex } from "@/lib/dateKey";
import {
  buildQueue,
  clampNewPerDay,
  deckStats,
  hardestCards,
  isDue,
  isNew,
  MIN_EASE,
  newCard,
  nextEase,
  previewInterval,
  recordInLog,
  requeueAfterAgain,
  review,
  START_EASE,
} from "@/lib/srs";
import type { SrsCard } from "@/lib/srs";

const D0 = "2026-03-01";

describe("dateKey", () => {
  it("formats the local calendar day", () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts days between keys", () => {
    expect(daysBetween("2026-03-01", "2026-03-08")).toBe(7);
    expect(daysBetween("2026-03-08", "2026-03-01")).toBe(-7);
  });

  it("validates keys", () => {
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("2026-2-3")).toBe(false);
    expect(isDateKey(20260301)).toBe(false);
    expect(isDateKey("2026-03-01")).toBe(true);
  });

  it("gives Monday as 0", () => {
    expect(weekdayIndex("2026-03-02")).toBe(0); // a Monday
    expect(weekdayIndex("2026-03-08")).toBe(6); // a Sunday
  });
});

describe("SM-2 ease", () => {
  it("follows EF' = EF + (0.1 - (5-q)(0.08 + (5-q)0.02))", () => {
    expect(nextEase(2.5, 5)).toBe(2.6);
    expect(nextEase(2.5, 4)).toBe(2.5);
    expect(nextEase(2.5, 3)).toBe(2.36);
    expect(nextEase(2.5, 1)).toBe(1.96);
  });

  it("never drops below 1.3", () => {
    let ease = START_EASE;
    for (let i = 0; i < 20; i++) ease = nextEase(ease, 1);
    expect(ease).toBe(MIN_EASE);
  });
});

describe("review", () => {
  it("starts a new card with interval 1, then 6, then interval x ease", () => {
    let card = newCard("noun:kopf", D0);
    expect(isNew(card)).toBe(true);

    card = review(card, "good", D0);
    expect(card.interval).toBe(1);
    expect(card.due).toBe("2026-03-02");
    expect(card.reps).toBe(1);
    expect(isNew(card)).toBe(false);

    card = review(card, "good", card.due);
    expect(card.interval).toBe(6);
    expect(card.due).toBe("2026-03-08");

    card = review(card, "good", card.due);
    expect(card.interval).toBe(15); // round(6 * 2.5)
    expect(card.ease).toBe(2.5);
  });

  it("easy raises the ease and grows intervals faster than good", () => {
    let easy = newCard("a", D0);
    let good = newCard("b", D0);
    for (let i = 0; i < 4; i++) {
      easy = review(easy, "easy", easy.due);
      good = review(good, "good", good.due);
    }
    expect(easy.ease).toBeGreaterThan(good.ease);
    expect(easy.interval).toBeGreaterThan(good.interval);
  });

  it("hard lowers the ease but still counts as a pass", () => {
    const card = review(newCard("a", D0), "hard", D0);
    expect(card.ease).toBe(2.36);
    expect(card.reps).toBe(1);
    expect(card.lapses).toBe(0);
  });

  it("again is a lapse: repetitions restart and the card is due tomorrow", () => {
    let card = newCard("a", D0);
    card = review(card, "good", D0);
    card = review(card, "good", card.due);
    const before = card;
    card = review(card, "again", "2026-03-20");
    expect(card.reps).toBe(0);
    expect(card.interval).toBe(1);
    expect(card.lapses).toBe(1);
    expect(card.due).toBe("2026-03-21");
    expect(card.ease).toBeLessThan(before.ease);
    // The next good answer starts over at 1 day.
    expect(review(card, "good", card.due).interval).toBe(1);
  });

  it("always grows the interval by at least a day after the second pass", () => {
    let card: SrsCard = { ...newCard("a", D0), reps: 2, interval: 6, ease: MIN_EASE, last: D0 };
    card = review(card, "good", D0);
    expect(card.interval).toBeGreaterThanOrEqual(7);
  });

  it("does not mutate its input", () => {
    const card = newCard("a", D0);
    const copy = { ...card };
    review(card, "easy", D0);
    expect(card).toEqual(copy);
  });

  it("previews the interval of each answer", () => {
    const card = review(newCard("a", D0), "good", D0); // interval 1, reps 1
    expect(previewInterval(card, "again", "2026-03-02")).toBe(1);
    expect(previewInterval(card, "good", "2026-03-02")).toBe(6);
  });
});

describe("queue", () => {
  const cards = (): Record<string, SrsCard> => {
    const reviewed = (id: string, due: string): SrsCard => ({ ...newCard(id, "2026-01-01"), last: "2026-01-02", interval: 3, reps: 2, due });
    return {
      a: reviewed("a", "2026-03-03"), // overdue by 2
      b: reviewed("b", "2026-03-05"), // due today
      c: reviewed("c", "2026-03-09"), // later
      n1: newCard("n1", "2026-03-01"),
      n2: newCard("n2", "2026-03-02"),
      n3: newCard("n3", "2026-03-04"),
    };
  };

  it("puts due cards first (most overdue first), then new cards up to the daily limit", () => {
    const q = buildQueue(cards(), { today: "2026-03-05", newPerDay: 2, newDoneToday: 0 });
    expect(q.ids).toEqual(["a", "b", "n1", "n2"]);
    expect(q.dueCount).toBe(2);
    expect(q.newCount).toBe(2);
    expect(q.newBacklog).toBe(1);
  });

  it("subtracts new cards already done today", () => {
    const q = buildQueue(cards(), { today: "2026-03-05", newPerDay: 2, newDoneToday: 1 });
    expect(q.ids).toEqual(["a", "b", "n1"]);
    const none = buildQueue(cards(), { today: "2026-03-05", newPerDay: 2, newDoneToday: 5 });
    expect(none.ids).toEqual(["a", "b"]);
  });

  it("allows 0 new cards per day", () => {
    const q = buildQueue(cards(), { today: "2026-03-05", newPerDay: 0, newDoneToday: 0 });
    expect(q.newCount).toBe(0);
    expect(q.newBacklog).toBe(3);
  });

  it("is empty for an empty deck", () => {
    expect(buildQueue({}, { today: D0, newPerDay: 10, newDoneToday: 0 }).ids).toEqual([]);
  });

  it("knows what is due", () => {
    expect(isDue(newCard("a", D0), D0)).toBe(true);
    expect(isDue({ ...newCard("a", D0), due: "2026-03-02" }, D0)).toBe(false);
  });
});

describe("session helpers", () => {
  it("repeats an 'again' card once at the end of the session", () => {
    const queue = ["a", "b", "c"];
    expect(requeueAfterAgain(queue, 0, "again", new Set())).toEqual(["a", "b", "c", "a"]);
    expect(requeueAfterAgain(queue, 0, "again", new Set(["a"]))).toEqual(queue);
    expect(requeueAfterAgain(queue, 0, "good", new Set())).toEqual(queue);
    expect(requeueAfterAgain(queue, 9, "again", new Set())).toEqual(queue);
  });

  it("counts answers and first answers per day", () => {
    let log = recordInLog({}, D0, true);
    log = recordInLog(log, D0, false);
    log = recordInLog(log, "2026-03-02", false);
    expect(log[D0]).toEqual({ reviews: 2, newCards: 1 });
    expect(log["2026-03-02"]).toEqual({ reviews: 1, newCards: 0 });
  });

  it("clamps the daily new-card setting", () => {
    expect(clampNewPerDay(-5)).toBe(0);
    expect(clampNewPerDay(12.6)).toBe(13);
    expect(clampNewPerDay(5000)).toBe(100);
    expect(clampNewPerDay(Number.NaN)).toBe(10);
  });
});

describe("deck statistics", () => {
  it("splits cards into new, learning and mature", () => {
    const mk = (id: string, interval: number, due: string): SrsCard => ({ ...newCard(id, D0), last: D0, interval, reps: 3, due });
    const deck = {
      n: newCard("n", D0),
      l: mk("l", 6, "2026-03-07"),
      m: mk("m", 30, "2026-03-31"),
      d: mk("d", 3, "2026-03-01"),
    };
    expect(deckStats(deck, D0)).toEqual({ total: 4, fresh: 1, learning: 2, mature: 1, dueToday: 1 });
  });

  it("lists the cards with the most lapses first", () => {
    const deck = {
      a: { ...newCard("a", D0), lapses: 1 },
      b: { ...newCard("b", D0), lapses: 4 },
      c: newCard("c", D0),
      d: { ...newCard("d", D0), lapses: 2 },
    };
    expect(hardestCards(deck, 2).map((c) => c.id)).toEqual(["b", "d"]);
  });
});
