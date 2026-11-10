import { describe, expect, it } from "vitest";
import { newCard, review } from "@/lib/srs";
import type { SrsCard } from "@/lib/srs";
import { emptySrsState, mergeSrsStates, migrateSrs, sanitizeSrsState } from "@/lib/srsData";
import type { SrsState } from "@/lib/srsData";

const D0 = "2026-03-01";

const sample = (): SrsState => {
  const a = review(newCard("noun:kopf", D0), "good", D0);
  return { cards: { [a.id]: a, "verb:gehen": newCard("verb:gehen", D0) }, log: { [D0]: { reviews: 1, newCards: 1 } }, newPerDay: 7 };
};

describe("merge", () => {
  it("keeps the union of cards and the more recently reviewed copy", () => {
    const base = newCard("noun:kopf", D0);
    const older: SrsCard = { ...base, last: "2026-03-02", reps: 1, interval: 1, due: "2026-03-03" };
    const newer: SrsCard = { ...base, last: "2026-03-05", reps: 3, interval: 15, due: "2026-03-20" };
    const current: SrsState = { cards: { [older.id]: older }, log: { "2026-03-02": { reviews: 5, newCards: 2 } }, newPerDay: 10 };
    const incoming: SrsState = {
      cards: { [newer.id]: newer, "verb:gehen": newCard("verb:gehen", D0) },
      log: { "2026-03-02": { reviews: 3, newCards: 4 }, "2026-03-05": { reviews: 8, newCards: 0 } },
      newPerDay: 3,
    };
    const merged = mergeSrsStates(current, incoming);
    expect(Object.keys(merged.cards).sort()).toEqual(["noun:kopf", "verb:gehen"]);
    expect(merged.cards["noun:kopf"]).toEqual(newer);
    expect(merged.log["2026-03-02"]).toEqual({ reviews: 5, newCards: 4 });
    expect(merged.log["2026-03-05"]).toEqual({ reviews: 8, newCards: 0 });
    expect(merged.newPerDay).toBe(10);
  });

  it("prefers a reviewed card over an unreviewed one", () => {
    const reviewed = review(newCard("a", D0), "good", D0);
    const merged = mergeSrsStates(
      { cards: { a: newCard("a", D0) }, log: {}, newPerDay: 10 },
      { cards: { a: reviewed }, log: {}, newPerDay: 10 },
    );
    expect(merged.cards.a).toEqual(reviewed);
  });
});

describe("migration and sanitizing", () => {
  it("returns an empty deck for missing or garbage storage", () => {
    expect(migrateSrs(undefined, 0)).toEqual(emptySrsState());
    expect(migrateSrs("nope", 1)).toEqual(emptySrsState());
    expect(migrateSrs(null, 1)).toEqual(emptySrsState());
  });

  it("keeps valid cards and drops broken ones", () => {
    const good = review(newCard("noun:kopf", D0), "good", D0);
    const state = sanitizeSrsState({
      cards: { good, bad: { id: "bad", ease: 99 }, worse: 5 },
      log: { [D0]: { reviews: 2, newCards: 1 }, nonsense: { reviews: 1, newCards: 0 }, "2026-03-02": { reviews: -1, newCards: 0 } },
      newPerDay: 25,
    });
    expect(Object.keys(state.cards)).toEqual(["noun:kopf"]);
    expect(state.log).toEqual({ [D0]: { reviews: 2, newCards: 1 } });
    expect(state.newPerDay).toBe(25);
  });

  it("passes a current-version state through unchanged", () => {
    const state = sample();
    expect(migrateSrs(state, 1)).toEqual(state);
  });
});
