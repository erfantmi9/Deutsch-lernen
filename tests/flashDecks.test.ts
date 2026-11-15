import { describe, expect, it } from "vitest";
import { reviewCards } from "@/lib/reviewData";
import { mulberry32 } from "@/lib/shuffle";
import { DECK_IDS, deckCards, flipCard, isDeckId, markCard, roundDone, startRound } from "@/lib/flashDecks";

describe("flashcard decks", () => {
  it("every deck has cards, and together they hold every card exactly once", () => {
    const seen = new Map<string, number>();
    for (const id of DECK_IDS) {
      const cards = deckCards(reviewCards, id);
      expect(cards.length, id).toBeGreaterThan(0);
      for (const c of cards) seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
    }
    expect(seen.size).toBe(reviewCards.length);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  it("knows its deck ids", () => {
    expect(isDeckId("verbs")).toBe(true);
    expect(isDeckId("food")).toBe(true);
    expect(isDeckId("nope")).toBe(false);
  });

  it("a round keeps every card once, shuffled or in order", () => {
    const ids = ["a", "b", "c", "d", "e"];
    expect(startRound(ids, null).order).toEqual(ids);
    const mixed = startRound(ids, mulberry32(7)).order;
    expect([...mixed].sort()).toEqual(ids);
  });

  it("a card is marked only after it was turned over", () => {
    let r = startRound(["a", "b"], null);
    expect(markCard(r, true)).toBe(r);
    r = markCard(flipCard(r), false);
    expect(r).toMatchObject({ index: 1, flipped: false, unknown: ["a"], known: [] });
    r = markCard(flipCard(r), true);
    expect(r.known).toEqual(["b"]);
    expect(roundDone(r)).toBe(true);
    expect(markCard(flipCard(r), true)).toEqual(flipCard(r));
  });
});
