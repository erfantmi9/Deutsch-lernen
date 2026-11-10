import { describe, expect, it } from "vitest";
import {
  checkNoun,
  checkSentence,
  checkVerb,
  findDuplicateIds,
  isPermutation,
  normalizeToken,
} from "../lib/validation/rules";
import type { SentenceExercise } from "../types/sentence";
import type { VerbEntry } from "../types/verb";
import type { VocabEntry } from "../types/vocab";

const i3 = { en: "a", fa: "ب", de: "c" };

const noun: VocabEntry = {
  id: "maedchen",
  word: "Mädchen",
  article: "das",
  plural: "Mädchen",
  translations: { en: "girl", fa: "دختر" },
  grammarRule: { ...i3, simple: i3 },
  ruleCategory: "exception",
  example: i3,
  category: "family",
  level: "A1",
};

const conj = { ich: "a", du: "b", er_sie_es: "c", wir: "d", ihr: "e", sie_Sie: "f" };
const verb: VerbEntry = {
  id: "aufstehen",
  infinitive: "aufstehen",
  level: "A1",
  category: "daily",
  usage: "common",
  translations: { en: "to get up", fa: "بلند شدن" },
  type: "separable",
  separable: { prefix: "auf", stem: "stehen" },
  present: conj,
  perfekt: { auxiliary: "sein", partizip2: "aufgestanden" },
  example: i3,
};

const sentence: SentenceExercise = {
  id: "s1",
  level: "A1",
  grammarFocus: "v2",
  tokens: ["Ich", "lerne", "heute", "Deutsch."],
  distractors: ["lernst"],
  translations: { en: "a", fa: "ب" },
  hint: i3,
  explanation: i3,
  acceptedOrders: [["Heute", "lerne", "ich", "Deutsch."]],
};

describe("checkNoun", () => {
  it("passes for das Mädchen", () => {
    expect(checkNoun(noun)).toEqual([]);
  });
  it("warns when -chen is not das, and when -ung is not die", () => {
    expect(checkNoun({ ...noun, article: "die" })[0]?.severity).toBe("warning");
    expect(checkNoun({ ...noun, word: "Zeitung", article: "der" })[0]?.severity).toBe("warning");
  });
});

describe("checkVerb", () => {
  it("passes for a valid separable verb", () => {
    expect(checkVerb(verb)).toEqual([]);
  });
  it("errors on a separable verb without `separable` and on an empty form", () => {
    const { separable: _removed, ...rest } = verb;
    const problems = checkVerb({ ...rest, present: { ...conj, wir: " " } });
    expect(problems.filter((p) => p.severity === "error").length).toBe(2);
  });
});

describe("checkSentence", () => {
  it("passes for a valid sentence", () => {
    expect(checkSentence(sentence)).toEqual([]);
  });
  it("errors on too few tokens, a distractor that is a token, and a bad acceptedOrder", () => {
    const problems = checkSentence({
      ...sentence,
      tokens: ["Ich", "lerne"],
      distractors: ["ich"],
      acceptedOrders: [["Ich", "lerne", "Deutsch."]],
    });
    expect(problems.filter((p) => p.severity === "error")).toHaveLength(3);
  });
});

describe("helpers", () => {
  it("normalizeToken ignores case and trailing punctuation", () => {
    expect(normalizeToken("Berlin.")).toBe("berlin");
    expect(normalizeToken("du?")).toBe("du");
  });
  it("isPermutation compares as multisets", () => {
    expect(isPermutation(["In", "Berlin", "wohnen", "wir."], ["Wir", "wohnen", "in", "Berlin."])).toBe(true);
    expect(isPermutation(["a", "b"], ["a", "c"])).toBe(false);
  });
  it("findDuplicateIds reports a repeated id", () => {
    expect(findDuplicateIds([{ file: "a", id: "x" }, { file: "b", id: "x" }])).toHaveLength(1);
    expect(findDuplicateIds([{ file: "a", id: "x" }, { file: "b", id: "y" }])).toEqual([]);
  });
});
