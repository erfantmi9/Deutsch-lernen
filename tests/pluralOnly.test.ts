import { describe, expect, it } from "vitest";
import { reviewCards } from "@/lib/reviewData";
import { VocabEntrySchema } from "@/lib/schemas/vocab";
import { vocab } from "@/lib/vocab";
import { pickWord } from "@/stores/quizStore";

describe("plural-only nouns", () => {
  const pluralOnly = vocab.filter((w) => w.pluralOnly);

  it("ships die Eltern, Geschwister, Großeltern and Verwandten as plural-only", () => {
    expect(pluralOnly.map((w) => w.id).sort()).toEqual(["eltern", "geschwister", "grosseltern", "verwandte"]);
  });

  it("are never asked in the der/die/das quiz", () => {
    const ids = new Set(pluralOnly.map((w) => w.id));
    for (let i = 0; i < 50; i++) {
      const r = i / 50;
      expect(ids.has(pickWord(null, [], () => r).id)).toBe(false);
    }
  });

  it("get no article colour and no separate plural line on their card", () => {
    const card = reviewCards.find((c) => c.id === "noun:eltern");
    expect(card).toMatchObject({ front: "die Eltern", pluralOnly: true, article: undefined, detail: undefined });
  });

  it("must use die and the same form for word and plural", () => {
    const base = vocab.find((w) => w.id === "eltern")!;
    expect(VocabEntrySchema.safeParse({ ...base, article: "der" }).success).toBe(false);
    expect(VocabEntrySchema.safeParse({ ...base, plural: "Elter" }).success).toBe(false);
  });
});
