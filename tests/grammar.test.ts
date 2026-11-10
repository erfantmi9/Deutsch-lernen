import { GRAMMAR_GROUPS, GRAMMAR_GROUP_OF_TOPIC } from "@/types/grammar";
import { describe, expect, it } from "vitest";
import {
  GlossaryListSchema,
  GrammarExerciseListSchema,
  GrammarExerciseSchema,
  GrammarLessonListSchema,
  GrammarLessonSchema,
  GrammarTableSchema,
} from "../lib/schemas/grammar";
import { getExercise, getLesson, getLessonExercises, getNeighbours, glossary, grammarExercises, grammarLessons } from "../lib/grammar";
import { checkGrammarData } from "../lib/validation/grammarRules";
import type { GrammarExercise, GrammarLesson } from "../types/grammar";
import en from "../messages/en.json";
import fa from "../messages/fa.json";
import de from "../messages/de.json";

const i3 = { en: "a", fa: "ب", de: "c" };

const exercise: GrammarExercise = {
  id: "t-01",
  lessonId: "t",
  type: "choice",
  prompt: i3,
  sentenceDe: "Ich habe ___ Hund.",
  options: ["ein", "einen"],
  answer: "einen",
  explanation: i3,
};

function makeLesson(overrides: Partial<GrammarLesson> = {}): GrammarLesson {
  return {
    id: "t",
    order: 1,
    topic: "cases",
    title: i3,
    summary: i3,
    sections: [
      { heading: i3, body: i3 },
      { heading: i3, body: i3, table: { headers: ["gloss:case", "x"], rows: [["gloss:nominative", "der"]] } },
    ],
    examples: ["a", "b", "c", "d"].map((x) => ({ de: `Das ist ${x}.`, en: "x", fa: "ی", highlight: [x] })),
    exerciseIds: Array.from({ length: 8 }, (_, i) => `t-0${i + 1}`),
    ...overrides,
  };
}

function makeExercises(count = 8, lessonId = "t"): GrammarExercise[] {
  return Array.from({ length: count }, (_, i) => ({ ...exercise, id: `t-0${i + 1}`, lessonId }));
}

const errors = (lessons: GrammarLesson[], exercises: GrammarExercise[]) =>
  checkGrammarData(lessons, exercises, [
    { term: "case", en: "c", fa: "ک", de: "Kasus" },
    { term: "nominative", en: "n", fa: "ف", de: "Nominativ" },
  ]).filter((p) => p.problem.severity === "error");

describe("grammar schemas", () => {
  it("accepts a valid exercise", () => {
    expect(GrammarExerciseSchema.safeParse(exercise).success).toBe(true);
  });
  it("requires exactly one gap", () => {
    expect(GrammarExerciseSchema.safeParse({ ...exercise, sentenceDe: "Ich habe einen Hund." }).success).toBe(false);
    expect(GrammarExerciseSchema.safeParse({ ...exercise, sentenceDe: "___ habe ___ Hund." }).success).toBe(false);
  });
  it("requires choice answers to be among the options", () => {
    expect(GrammarExerciseSchema.safeParse({ ...exercise, answer: "eine" }).success).toBe(false);
    expect(GrammarExerciseSchema.safeParse({ ...exercise, options: undefined }).success).toBe(false);
  });
  it("lets fill and transform exercises omit options", () => {
    expect(GrammarExerciseSchema.safeParse({ ...exercise, type: "fill", options: undefined }).success).toBe(true);
    expect(GrammarExerciseSchema.safeParse({ ...exercise, type: "transform", options: undefined }).success).toBe(true);
  });
  it("rejects an unknown type and empty i18n text", () => {
    expect(GrammarExerciseSchema.safeParse({ ...exercise, type: "drag" }).success).toBe(false);
    expect(GrammarExerciseSchema.safeParse({ ...exercise, explanation: { ...i3, fa: " " } }).success).toBe(false);
  });
  it("rejects duplicate exercise ids", () => {
    expect(GrammarExerciseListSchema.safeParse([exercise, exercise]).success).toBe(false);
  });
  it("rejects table rows with the wrong number of cells", () => {
    expect(GrammarTableSchema.safeParse({ headers: ["a", "b"], rows: [["x", "y", "z"]] }).success).toBe(false);
    expect(GrammarTableSchema.safeParse({ headers: ["a", "b"], rows: [["x", "y"]] }).success).toBe(true);
  });
  it("accepts a valid lesson and rejects an unknown topic", () => {
    expect(GrammarLessonSchema.safeParse(makeLesson()).success).toBe(true);
    expect(GrammarLessonSchema.safeParse({ ...makeLesson(), topic: "weather" }).success).toBe(false);
  });
  it("rejects duplicate lesson ids and duplicate order numbers", () => {
    expect(GrammarLessonListSchema.safeParse([makeLesson(), makeLesson({ order: 2 })]).success).toBe(false);
    expect(GrammarLessonListSchema.safeParse([makeLesson(), makeLesson({ id: "u" })]).success).toBe(false);
  });
  it("rejects duplicate glossary terms", () => {
    const g = { term: "case", en: "c", fa: "ک", de: "Kasus" };
    expect(GlossaryListSchema.safeParse([g, g]).success).toBe(false);
  });
});

describe("checkGrammarData", () => {
  it("passes a consistent data set", () => {
    expect(errors([makeLesson()], makeExercises())).toEqual([]);
  });
  it("requires at least 8 exercises, 4 examples and 2-3 sections", () => {
    const lesson = makeLesson({
      exerciseIds: ["t-01"],
      examples: [],
      sections: [{ heading: i3, body: i3 }],
    });
    const messages = errors([lesson], makeExercises(1)).map((p) => p.problem.message);
    expect(messages.some((m) => m.includes("at least 8 exercises"))).toBe(true);
    expect(messages.some((m) => m.includes("at least 4 examples"))).toBe(true);
    expect(messages.some((m) => m.includes("2-3 sections"))).toBe(true);
  });
  it("flags unknown, foreign and unlisted exercises", () => {
    const lesson = makeLesson({ exerciseIds: [...makeLesson().exerciseIds.slice(0, 7), "missing"] });
    const exs = [...makeExercises(7), { ...exercise, id: "t-08", lessonId: "other" }, { ...exercise, id: "t-99", lessonId: "t" }];
    const messages = errors([lesson], exs).map((p) => p.problem.message);
    expect(messages.some((m) => m.includes('unknown exercise "missing"'))).toBe(true);
    expect(messages.some((m) => m.includes('unknown lessonId "other"'))).toBe(true);
    expect(messages.some((m) => m.includes("not listed in exerciseIds"))).toBe(true);
  });
  it("flags unknown glossary terms and bad highlights", () => {
    const lesson = makeLesson({
      sections: [
        { heading: i3, body: i3, table: { headers: ["gloss:case", "gloss:nope"], rows: [["x", "y"]] } },
        { heading: i3, body: i3 },
      ],
      examples: [{ de: "Das ist gut.", en: "x", fa: "ی", highlight: ["schlecht"] }, ...makeLesson().examples],
    });
    const messages = errors([lesson], makeExercises()).map((p) => p.problem.message);
    expect(messages.some((m) => m.includes('unknown glossary term "nope"'))).toBe(true);
    expect(messages.some((m) => m.includes('highlight "schlecht"'))).toBe(true);
  });
  it("flags duplicate options case-insensitively", () => {
    const exs = makeExercises();
    exs[0] = { ...exs[0], options: ["Ein", "ein", "einen"], answer: "einen" };
    const messages = errors([makeLesson()], exs).map((p) => p.problem.message);
    expect(messages.some((m) => m.includes("duplicates"))).toBe(true);
  });
});

describe("shipped grammar data", () => {
  it("has the sixteen A1 grammar lessons in course order", () => {
    expect(grammarLessons.map((l) => l.id)).toEqual([
      "pronouns",
      "nom-akk",
      "possessives",
      "negation",
      "plural",
      "dative",
      "wechsel",
      "questions",
      "imperative",
      "modal",
      "word-order",
      "perfekt",
      "separable",
      "time-prepositions",
      "conjunctions",
      "es-gibt",
    ]);
    expect(grammarLessons.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });
  it("covers every topic that the course teaches", () => {
    const topics = new Set(grammarLessons.map((l) => l.topic));
    for (const t of ["pronouns", "cases", "possessives", "negation", "plural", "prepositions", "questions", "imperative", "modal", "word-order"]) {
      expect(topics.has(t as never)).toBe(true);
    }
  });
  it("has no validation errors or warnings", () => {
    expect(checkGrammarData(grammarLessons, grammarExercises, glossary)).toEqual([]);
  });
  it("gives every lesson 8+ exercises, 4+ examples and 2-3 sections", () => {
    for (const l of grammarLessons) {
      expect(getLessonExercises(l).length).toBeGreaterThanOrEqual(8);
      expect(l.examples.length).toBeGreaterThanOrEqual(4);
      expect(l.sections.length).toBeGreaterThanOrEqual(2);
      expect(l.sections.length).toBeLessThanOrEqual(3);
    }
  });
  it("uses all three exercise types", () => {
    const types = new Set(grammarExercises.map((e) => e.type));
    expect([...types].sort()).toEqual(["choice", "fill", "transform"]);
  });
  it("looks lessons and exercises up by id and finds neighbours", () => {
    expect(getLesson("negation")?.topic).toBe("negation");
    expect(getLesson("nope")).toBeUndefined();
    expect(getExercise("pron-01")?.lessonId).toBe("pronouns");
    expect(getNeighbours("pronouns")).toMatchObject({ prev: null, next: { id: "nom-akk" } });
    expect(getNeighbours("plural")).toMatchObject({ prev: { id: "negation" }, next: { id: "dative" } });
    expect(getNeighbours("word-order")).toMatchObject({ prev: { id: "modal" }, next: { id: "perfekt" } });
    expect(getNeighbours("es-gibt")).toMatchObject({ prev: { id: "conjunctions" }, next: null });
    expect(getNeighbours("nope")).toEqual({ prev: null, next: null });
  });
  it("keeps the masculine accusative rule in the case table", () => {
    const table = getLesson("nom-akk")?.sections.find((s) => s.table)?.table;
    expect(table?.rows[1]).toEqual(["gloss:accusative", "**den** / **einen**", "die / eine", "das / ein", "die / —"]);
  });
});

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe("grammar UI messages", () => {
  it("has the same Grammar keys in en, fa and de", () => {
    const base = keyPaths(en.Grammar).sort();
    expect(keyPaths(fa.Grammar).sort()).toEqual(base);
    expect(keyPaths(de.Grammar).sort()).toEqual(base);
  });
  it("has a label for every grammar topic", () => {
    for (const topic of ["pronouns", "cases", "articles", "possessives", "negation", "plural", "prepositions", "questions", "imperative", "modal", "word-order"]) {
      expect((en.Grammar.topics as Record<string, string>)[topic]).toBeTruthy();
    }
  });
  it("has nav and home entries in every locale", () => {
    for (const m of [en, fa, de]) {
      expect(m.Nav.grammar).toBeTruthy();
      expect(m.Home.modules.grammar.title).toBeTruthy();
    }
  });
});

describe("grammar groups", () => {
  it("puts every shipped lesson into one of the page groups", () => {
    for (const l of grammarLessons) expect(GRAMMAR_GROUPS).toContain(GRAMMAR_GROUP_OF_TOPIC[l.topic]);
    for (const g of GRAMMAR_GROUPS) {
      expect(grammarLessons.some((l) => GRAMMAR_GROUP_OF_TOPIC[l.topic] === g), g).toBe(true);
    }
  });
});
