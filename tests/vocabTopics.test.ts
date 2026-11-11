import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import fa from "@/messages/fa.json";
import de from "@/messages/de.json";
import { reviewCards } from "@/lib/reviewData";
import { adjectives } from "@/lib/vocabExtended";
import { mulberry32 } from "@/lib/shuffle";
import { buildRound, OPTION_COUNT, ROUND_SIZE } from "@/lib/topicPractice";
import {
  cardSubgroup,
  COLOR_SWATCH,
  colorCompound,
  deckPercent,
  getTopic,
  searchCards,
  subgroupLabelKey,
  TOPIC_IDS,
  topicCards,
  topicLabelKey,
  topicOfCard,
} from "@/lib/vocabTopics";

const words = reviewCards.filter((c) => c.kind !== "verb");
const get = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);

describe("vocabulary topics", () => {
  it("put every non-verb word in exactly one topic", () => {
    const seen = new Map<string, number>();
    for (const id of TOPIC_IDS) for (const c of topicCards(words, getTopic(id)!)) seen.set(c.id, (seen.get(c.id) ?? 0) + 1);
    expect(seen.size).toBe(words.length);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
    for (const c of words) expect(topicCards(words, getTopic(topicOfCard(c)!)!).includes(c), c.id).toBe(true);
  });

  it("have no empty topic, and every word of a topic with sub-topics has a known one", () => {
    for (const id of TOPIC_IDS) {
      const topic = getTopic(id)!;
      const list = topicCards(words, topic);
      expect(list.length, id).toBeGreaterThan(0);
      if (topic.subgroups.length > 0) for (const c of list) expect(topic.subgroups, c.id).toContain(cardSubgroup(c));
    }
  });

  it("label every topic and sub-topic in every language", () => {
    for (const messages of [en, fa, de]) {
      for (const id of TOPIC_IDS) {
        const topic = getTopic(id)!;
        expect(get(messages.Vocabulary, topicLabelKey(topic)), id).toBeTruthy();
        for (const s of topic.subgroups) expect(get(messages.Vocabulary, subgroupLabelKey(topic, s)), `${id}/${s}`).toBeTruthy();
      }
    }
  });

  it("rejects unknown topic ids", () => {
    expect(getTopic("verbs")).toBeUndefined();
    expect(getTopic("nope")).toBeUndefined();
    expect(getTopic("family")?.kind).toBe("noun");
    expect(getTopic("adjectives")?.kind).toBe("adjective");
  });

  it("gives every colour adjective a swatch", () => {
    const colours = adjectives.filter((a) => a.kind === "color").map((a) => a.id);
    expect(colours.length).toBeGreaterThan(10);
    expect(Object.keys(COLOR_SWATCH).sort()).toEqual([...colours].sort());
  });

  it("splits hell-/dunkel- colours", () => {
    expect(colorCompound("dunkelblau")).toEqual(["dunkel", "blau"]);
    expect(colorCompound("hellgrün")).toEqual(["hell", "grün"]);
    expect(colorCompound("blau")).toBeNull();
  });

  it("counts the share in the deck, rounded down", () => {
    expect(deckPercent([], {})).toBe(0);
    expect(deckPercent(["a", "b", "c"], { a: 1 })).toBe(33);
    expect(deckPercent(["a", "b", "c"], { a: 1, b: 1 })).toBe(66);
    expect(deckPercent(["a", "b"], { a: 1, b: 1, z: 1 })).toBe(100);
  });

  it("searches German (with or without article), translations and examples", () => {
    expect(searchCards(words, "der Vater").map((c) => c.id)).toContain("noun:vater");
    expect(searchCards(words, "VATER").map((c) => c.id)).toContain("noun:vater");
    expect(searchCards(words, "پدر").map((c) => c.id)).toContain("noun:vater");
    expect(searchCards(words, "father").map((c) => c.id)).toContain("noun:vater");
    expect(searchCards(words, "zzzzqqq")).toEqual([]);
    // "rot" is also in "Brot" and in "Der Apfel ist rot.": the word itself comes first.
    expect(searchCards(words, "rot")[0].id).toBe("adjective:rot");
    expect(searchCards(words, "der Kopf")[0].id).toBe("noun:kopf");
    expect(searchCards(words, "  ")).toHaveLength(words.length);
  });
});

describe("topic practice", () => {
  const family = topicCards(words, getTopic("family")!);
  const meaning = (c: (typeof family)[number]) => c.translations.fa;

  it("asks up to ROUND_SIZE different words with four distinct choices including the answer", () => {
    for (let seed = 1; seed < 20; seed++) {
      const round = buildRound(family, family, meaning, mulberry32(seed));
      expect(round).toHaveLength(Math.min(ROUND_SIZE, family.length));
      expect(new Set(round.map((q) => q.cardId)).size).toBe(round.length);
      for (const q of round) {
        expect(q.options).toHaveLength(OPTION_COUNT);
        expect(q.options.filter((o) => o === q.cardId)).toHaveLength(1);
        const texts = q.options.map((o) => meaning(family.find((c) => c.id === o)!));
        expect(new Set(texts).size).toBe(texts.length);
      }
    }
  });

  it("takes distractors from the whole topic when a sub-topic is small", () => {
    const small = family.slice(0, 2);
    const round = buildRound(small, family, meaning, mulberry32(7));
    expect(round).toHaveLength(2);
    for (const q of round) expect(q.options).toHaveLength(OPTION_COUNT);
  });

  it("prefers distractors from the same sub-topic", () => {
    const close = family.filter((c) => c.subgroup === "family");
    expect(close.length).toBeGreaterThanOrEqual(OPTION_COUNT);
    for (const q of buildRound(close, family, meaning, mulberry32(11))) {
      for (const o of q.options) expect(close.some((c) => c.id === o), o).toBe(true);
    }
  });

  it("is deterministic for a seeded rng", () => {
    expect(buildRound(family, family, meaning, mulberry32(3))).toEqual(buildRound(family, family, meaning, mulberry32(3)));
  });
});
