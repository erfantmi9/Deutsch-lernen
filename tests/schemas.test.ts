import { describe, expect, it } from "vitest";
import { SentenceExerciseSchema } from "../lib/schemas/sentence";
import { VerbEntrySchema } from "../lib/schemas/verb";
import { VocabEntrySchema, VocabListSchema } from "../lib/schemas/vocab";
import { vocab } from "../data/vocab";
import verbs from "../data/verbs/a1.json";
import sentences from "../data/sentences/a1.json";

const i3 = { en: "a", fa: "ب", de: "c" };

const noun = {
  id: "tisch",
  word: "Tisch",
  article: "der",
  plural: "Tische",
  translations: { en: "table", fa: "میز" },
  grammarRule: { ...i3, simple: i3 },
  ruleCategory: "learn",
  example: i3,
  category: "home",
  subcategory: "furniture",
  level: "A1",
};

const conj = { ich: "a", du: "b", er_sie_es: "c", wir: "d", ihr: "e", sie_Sie: "f" };
const verb = {
  id: "machen",
  infinitive: "machen",
  level: "A1",
  category: "daily",
  usage: "common",
  translations: { en: "to do", fa: "انجام دادن" },
  type: "regular",
  present: conj,
  perfekt: { auxiliary: "haben", partizip2: "gemacht" },
  example: i3,
};

const sentence = {
  id: "s1",
  level: "A1",
  grammarFocus: "v2",
  tokens: ["Ich", "lerne", "Deutsch."],
  translations: { en: "a", fa: "ب" },
  hint: i3,
  explanation: i3,
};

describe("vocab schema", () => {
  it("accepts a valid noun", () => {
    expect(VocabEntrySchema.safeParse(noun).success).toBe(true);
  });
  it("rejects an invalid article", () => {
    expect(VocabEntrySchema.safeParse({ ...noun, article: "dem" }).success).toBe(false);
  });
  it("rejects an empty i18n string", () => {
    expect(VocabEntrySchema.safeParse({ ...noun, example: { ...i3, fa: " " } }).success).toBe(false);
  });
  it("rejects duplicate ids in a list", () => {
    expect(VocabListSchema.safeParse([noun, noun]).success).toBe(false);
  });
  it("requires a known subcategory where the category has sub-groups, and forbids it elsewhere", () => {
    const { subcategory: _omit, ...withoutSub } = noun;
    expect(VocabEntrySchema.safeParse(withoutSub).success).toBe(false);
    expect(VocabEntrySchema.safeParse({ ...noun, subcategory: "kitchen-sink" }).success).toBe(false);
    expect(VocabEntrySchema.safeParse({ ...noun, category: "jobs" }).success).toBe(false);
    expect(VocabEntrySchema.safeParse({ ...withoutSub, category: "jobs" }).success).toBe(true);
  });
});

describe("verb schema", () => {
  it("accepts a valid verb", () => {
    expect(VerbEntrySchema.safeParse(verb).success).toBe(true);
  });
  it("rejects a missing present form", () => {
    expect(VerbEntrySchema.safeParse({ ...verb, present: { ...conj, du: "" } }).success).toBe(false);
  });
});

describe("sentence schema", () => {
  it("accepts a valid sentence", () => {
    expect(SentenceExerciseSchema.safeParse(sentence).success).toBe(true);
  });
  it("rejects an unknown grammarFocus", () => {
    expect(SentenceExerciseSchema.safeParse({ ...sentence, grammarFocus: "nope" }).success).toBe(false);
  });
});

describe("shipped data", () => {
  it("has 656 unique nouns across 19 categories, including the legacy ids", () => {
    expect(vocab).toHaveLength(656);
    expect(new Set(vocab.map((w) => w.category)).size).toBe(19);
    const ids = new Set(vocab.map((w) => w.id));
    for (const id of ["mann", "frau", "maedchen", "junge", "kind", "zeitung", "universitaet", "montag", "essen", "lehrerin"]) {
      expect(ids.has(id)).toBe(true);
    }
  });
  it("keeps the 12 original verbs first (162 in total) and 15 sentences", () => {
    expect(verbs).toHaveLength(162);
    expect(verbs.slice(0, 12).map((v) => v.id)).toEqual([
      "sein", "haben", "machen", "wohnen", "heissen", "gehen", "fahren", "essen", "sprechen", "koennen", "muessen", "aufstehen",
    ]);
    expect(sentences).toHaveLength(15);
  });
});
