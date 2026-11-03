import { describe, expect, it } from "vitest";
import { buildReviewCards, cardId, parseCardId, prepositionDetail, verbDetail } from "@/lib/reviewCards";
import { reviewCardIds, reviewCards } from "@/lib/reviewData";
import { verbs } from "@/lib/verbs";
import { vocab } from "@/lib/vocab";
import { adjectives, adverbs, phrases, prepositions } from "@/lib/vocabExtended";
import { AdjectiveListSchema, PrepositionEntrySchema } from "@/lib/schemas/vocabExtended";
import { checkAdjective, checkNounExample, checkPhrase, checkPreposition, checkVerbExample, exampleUsesWord } from "@/lib/validation/vocabRules";
import { VOCAB_CATEGORIES } from "@/types/vocab";
import { buildWordIndex, lookupWord } from "@/lib/wordLookup";

describe("shipped vocabulary", () => {
  it("has 25 nouns in each of the 8 new categories", () => {
    const added = ["shopping", "jobs", "weather", "colors", "clothes", "city", "hobbies", "numbers-time"] as const;
    for (const c of added) {
      expect(vocab.filter((w) => w.category === c)).toHaveLength(25);
      expect(VOCAB_CATEGORIES).toContain(c);
    }
    expect(vocab.length).toBe(56 + 200);
  });

  it("has unique noun ids and consistent articles", () => {
    expect(new Set(vocab.map((w) => w.id)).size).toBe(vocab.length);
    for (const w of vocab) expect(["der", "die", "das"]).toContain(w.article);
  });

  it("has 40 verbs with unique ids", () => {
    expect(verbs).toHaveLength(40);
    expect(new Set(verbs.map((v) => v.id)).size).toBe(40);
  });

  it("starts every batch with 25 adjectives, adverbs, prepositions and about 25 phrases", () => {
    expect(adjectives).toHaveLength(25);
    expect(adverbs).toHaveLength(25);
    expect(prepositions).toHaveLength(25);
    expect(phrases.length).toBeGreaterThanOrEqual(25);
  });

  it("has no content warnings in examples", () => {
    const problems = [
      ...vocab.flatMap(checkNounExample),
      ...verbs.flatMap(checkVerbExample),
      ...adjectives.flatMap(checkAdjective),
      ...prepositions.flatMap(checkPreposition),
      ...phrases.flatMap(checkPhrase),
    ];
    expect(problems).toEqual([]);
  });

  it("covers all three kinds of preposition", () => {
    expect(prepositions.filter((p) => p.wechsel).map((p) => p.id).sort()).toEqual(
      ["an", "auf", "hinter", "in", "neben", "ueber", "unter", "vor", "zwischen"],
    );
    expect(prepositions.filter((p) => !p.wechsel && p.cases[0] === "akk").map((p) => p.id).sort()).toEqual(
      ["bis", "durch", "fuer", "gegen", "ohne", "um"],
    );
    expect(prepositions.filter((p) => !p.wechsel && p.cases[0] === "dat")).toHaveLength(10);
  });

  it("gives separable verbs a prefix that their infinitive starts with", () => {
    for (const v of verbs.filter((x) => x.separable)) expect(v.infinitive.startsWith(v.separable!.prefix)).toBe(true);
  });
});

describe("extended schemas", () => {
  const example = { de: "Das ist gut.", en: "That is good.", fa: "این خوب است." };
  const base = { id: "x", word: "gut", translations: { en: "good", fa: "خوب" }, example, level: "A1" as const };

  it("requires comparative and superlative together", () => {
    expect(AdjectiveListSchema.safeParse([{ ...base, comparative: "besser" }]).success).toBe(false);
    expect(AdjectiveListSchema.safeParse([{ ...base, comparative: "besser", superlative: "am besten" }]).success).toBe(true);
    expect(AdjectiveListSchema.safeParse([base]).success).toBe(true);
  });

  it("keeps wechsel and cases consistent", () => {
    const prep = { ...base, id: "in", word: "in" };
    expect(PrepositionEntrySchema.safeParse({ ...prep, cases: ["dat"], wechsel: false }).success).toBe(true);
    expect(PrepositionEntrySchema.safeParse({ ...prep, cases: ["akk", "dat"], wechsel: true }).success).toBe(true);
    expect(PrepositionEntrySchema.safeParse({ ...prep, cases: ["dat"], wechsel: true }).success).toBe(false);
    expect(PrepositionEntrySchema.safeParse({ ...prep, cases: ["akk", "dat"], wechsel: false }).success).toBe(false);
  });

  it("rejects duplicate ids", () => {
    expect(AdjectiveListSchema.safeParse([base, base]).success).toBe(false);
  });

  it("flags a superlative without 'am'", () => {
    expect(checkAdjective({ ...base, comparative: "besser", superlative: "besten" }).some((p) => p.severity === "error")).toBe(true);
  });

  it("checks that an example uses the word", () => {
    expect(exampleUsesWord("Der Kopf tut weh.", ["Kopf"])).toBe(true);
    expect(exampleUsesWord("Der Kopf tut weh.", ["Hand"])).toBe(false);
  });
});

describe("review cards", () => {
  it("makes one card per word with unique `<kind>:<id>` ids", () => {
    const expected = vocab.length + verbs.length + adjectives.length + adverbs.length + prepositions.length + phrases.length;
    expect(reviewCards).toHaveLength(expected);
    expect(reviewCardIds.size).toBe(expected);
  });

  it("keeps the noun and the verb of the same spelling apart", () => {
    expect(reviewCardIds.has("noun:essen")).toBe(true);
    expect(reviewCardIds.has("verb:essen")).toBe(true);
  });

  it("shows nouns with article and plural", () => {
    const kopf = reviewCards.find((c) => c.id === "noun:kopf")!;
    expect(kopf.front).toBe("der Kopf");
    expect(kopf.article).toBe("der");
    expect(kopf.detail).toBe("die Köpfe");
  });

  it("omits the plural for nouns without one", () => {
    expect(reviewCards.find((c) => c.id === "noun:wetter")!.detail).toBeUndefined();
  });

  it("describes verbs, separable verbs and prepositions", () => {
    const gehen = verbs.find((v) => v.id === "gehen")!;
    expect(verbDetail(gehen)).toBe("er/sie/es geht · ist gegangen");
    const aufstehen = verbs.find((v) => v.id === "aufstehen")!;
    expect(verbDetail(aufstehen)).toBe("er/sie/es steht ... auf · ist aufgestanden");
    expect(prepositionDetail(prepositions.find((p) => p.id === "mit")!)).toBe("+ Dat.");
    expect(prepositionDetail(prepositions.find((p) => p.id === "fuer")!)).toBe("+ Akk.");
    expect(prepositionDetail(prepositions.find((p) => p.id === "in")!)).toBe("+ Akk. / Dat.");
  });

  it("parses card ids", () => {
    expect(parseCardId(cardId("noun", "kopf"))).toEqual({ kind: "noun", id: "kopf" });
    expect(parseCardId("phrase:guten-tag")).toEqual({ kind: "phrase", id: "guten-tag" });
    expect(parseCardId("nonsense")).toBeNull();
    expect(parseCardId("planet:mars")).toBeNull();
  });

  it("builds from plain data without touching globals", () => {
    const cards = buildReviewCards({ nouns: [], verbs: [], adjectives: [], adverbs: [], prepositions: [], phrases: phrases.slice(0, 2) });
    expect(cards.map((c) => c.kind)).toEqual(["phrase", "phrase"]);
  });
});

describe("word lookup with the larger vocabulary", () => {
  const index = buildWordIndex(vocab, verbs);

  it("finds new nouns and verb forms", () => {
    expect(lookupWord(index, "Jacke")?.display).toBe("die Jacke");
    expect(lookupWord(index, "Jacken")?.inflected).toBe(true);
    expect(lookupWord(index, "liest")?.display).toBe("lesen");
  });

  it("never indexes the '–' placeholder", () => {
    expect(index.nouns.has("–")).toBe(false);
  });
});
