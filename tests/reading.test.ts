import { describe, expect, it } from "vitest";
import { getReadingNeighbours, getReadingText, readingTexts } from "../lib/reading";
import { allTasksAnswered, checkTask, isAnswered, pairResults, scoreTasks } from "../lib/readingLogic";
import { ReadingTextSchema } from "../lib/schemas/reading";
import { checkReadingTexts, squash, wordCount } from "../lib/validation/contentRules";
import { highlightSegments } from "../lib/grammarText";
import { READING_KINDS } from "../types/reading";
import type { ChoiceTask, MatchingTask, ReadingTask, TrueFalseTask } from "../types/reading";

const i3 = { en: "a", fa: "ب", de: "c" };

const tf: TrueFalseTask = { id: "t1", type: "true-false", statement: "Das ist gut.", answer: true, evidence: "gut" };
const choice: ChoiceTask = { id: "t2", type: "choice", question: "Was?", options: ["a", "b", "c"], answer: "b", evidence: "gut" };
const matching: MatchingTask = {
  id: "t3",
  type: "matching",
  prompt: i3,
  pairs: [
    { item: "1", answer: "x" },
    { item: "2", answer: "y" },
    { item: "3", answer: "z" },
  ],
  options: ["x", "y", "z", "w"],
};
const text = Array.from({ length: 45 }, (_, i) => (i === 0 ? "gut" : `Wort${i}`)).join(" ");
const valid = {
  id: "t",
  kind: "email",
  title: i3,
  text,
  translation: { en: "a", fa: "ب" },
  tasks: [tf, { ...tf, id: "t1b", answer: false }, choice, matching],
};

describe("reading schema", () => {
  it("accepts a valid text", () => {
    expect(ReadingTextSchema.safeParse(valid).success).toBe(true);
  });
  it("needs exactly four tasks and a known kind", () => {
    expect(ReadingTextSchema.safeParse({ ...valid, tasks: valid.tasks.slice(0, 3) }).success).toBe(false);
    expect(ReadingTextSchema.safeParse({ ...valid, kind: "poem" }).success).toBe(false);
  });
  it("checks multiple choice: three unique options containing the answer", () => {
    const swap = (c: ChoiceTask) => ({ ...valid, tasks: [tf, tf, c, matching].map((t, i) => (i === 1 ? { ...tf, id: "x" } : t)) });
    expect(ReadingTextSchema.safeParse(swap({ ...choice, answer: "z" })).success).toBe(false);
    expect(ReadingTextSchema.safeParse(swap({ ...choice, options: ["a", "A", "c"] })).success).toBe(false);
    expect(ReadingTextSchema.safeParse(swap({ ...choice, options: ["a", "b"] })).success).toBe(false);
  });
  it("checks matching: one answer per item, answers among the options, at least one extra", () => {
    const swap = (m: MatchingTask) => ({ ...valid, tasks: [tf, { ...tf, id: "x" }, choice, m] });
    expect(ReadingTextSchema.safeParse(swap({ ...matching, options: ["x", "y", "z"] })).success).toBe(false);
    expect(ReadingTextSchema.safeParse(swap({ ...matching, options: ["x", "y", "q", "w"] })).success).toBe(false);
    expect(ReadingTextSchema.safeParse(swap({ ...matching, pairs: [...matching.pairs.slice(0, 2), { item: "3", answer: "x" }] })).success).toBe(false);
    expect(ReadingTextSchema.safeParse(swap({ ...matching, pairs: matching.pairs.slice(0, 2) })).success).toBe(false);
  });
  it("rejects an unknown task type", () => {
    const bad = { ...valid, tasks: [{ id: "q", type: "essay" }, tf, choice, matching] };
    expect(ReadingTextSchema.safeParse(bad).success).toBe(false);
  });
});

describe("checkReadingTexts", () => {
  const errors = (t: unknown[]) =>
    checkReadingTexts(t.map((x) => ReadingTextSchema.parse(x))).filter((p) => p.problem.severity === "error").map((p) => p.problem.message);

  it("counts words and squashes whitespace", () => {
    expect(wordCount("  Ein  Test\nmit drei ")).toBe(4);
    expect(squash("a \n b")).toBe("a b");
  });
  it("accepts a valid text", () => {
    expect(errors([valid])).toEqual([]);
  });
  it("flags texts that are too short or too long", () => {
    expect(errors([{ ...valid, text: "gut kurz" }]).some((m) => m.includes("2 words"))).toBe(true);
    expect(errors([{ ...valid, text: `gut ${"wort ".repeat(90)}` }]).some((m) => m.includes("words, expected"))).toBe(true);
  });
  it("flags evidence that is not in the text", () => {
    const bad = { ...valid, tasks: [{ ...tf, evidence: "nicht da" }, { ...tf, id: "t1b" }, choice, matching] };
    expect(errors([bad]).some((m) => m.includes("does not occur"))).toBe(true);
  });
  it("accepts evidence that spans a line break", () => {
    const t = { ...valid, text: `gut\n${text}`, tasks: [{ ...tf, evidence: "gut Wort1" }, { ...tf, id: "t1b" }, choice, matching] };
    expect(errors([t])).toEqual([]);
  });
  it("flags duplicate task ids across texts", () => {
    expect(errors([valid, { ...valid, id: "u" }]).some((m) => m.includes("is also used"))).toBe(true);
  });
});

describe("task checking", () => {
  it("checks true/false", () => {
    expect(checkTask(tf, true)).toBe(true);
    expect(checkTask(tf, false)).toBe(false);
    expect(checkTask(tf, null)).toBe(false);
    expect(checkTask(tf, "true")).toBe(false);
  });
  it("checks multiple choice", () => {
    expect(checkTask(choice, "b")).toBe(true);
    expect(checkTask(choice, "a")).toBe(false);
    expect(checkTask(choice, undefined)).toBe(false);
  });
  it("checks matching: every pair must be right", () => {
    expect(checkTask(matching, { 0: "x", 1: "y", 2: "z" })).toBe(true);
    expect(checkTask(matching, { 0: "x", 1: "z", 2: "y" })).toBe(false);
    expect(checkTask(matching, { 0: "x", 1: "y" })).toBe(false);
    expect(pairResults(matching, { 0: "x", 1: "z", 2: "z" })).toEqual([true, false, true]);
    expect(pairResults(matching, null)).toEqual([false, false, false]);
  });
  it("knows when a task is answered", () => {
    expect(isAnswered(tf, false)).toBe(true);
    expect(isAnswered(tf, null)).toBe(false);
    expect(isAnswered(choice, "")).toBe(false);
    expect(isAnswered(choice, "a")).toBe(true);
    expect(isAnswered(matching, { 0: "x", 1: "y" })).toBe(false);
    expect(isAnswered(matching, { 0: "x", 1: "y", 2: "w" })).toBe(true);
  });
  it("scores a whole text and applies the pass mark", () => {
    const tasks: ReadingTask[] = [tf, { ...tf, id: "b", answer: false }, choice, matching];
    const all = scoreTasks(tasks, [true, false, "b", { 0: "x", 1: "y", 2: "z" }]);
    expect(all).toMatchObject({ correct: 4, total: 4, passed: true });
    expect(scoreTasks(tasks, [true, false, "b", {}])).toMatchObject({ correct: 3, passed: true });
    expect(scoreTasks(tasks, [true, true, "a", {}])).toMatchObject({ correct: 1, passed: false, perTask: [true, false, false, false] });
    expect(scoreTasks(tasks, [])).toMatchObject({ correct: 0, passed: false });
    expect(allTasksAnswered(tasks, [true, false, "b", { 0: "x", 1: "y", 2: "z" }])).toBe(true);
    expect(allTasksAnswered(tasks, [true, false, "b"])).toBe(false);
  });
});

describe("shipped reading texts", () => {
  it("has 10 texts that cover every kind", () => {
    expect(readingTexts).toHaveLength(10);
    const kinds = new Set(readingTexts.map((t) => t.kind));
    for (const k of READING_KINDS) expect(kinds.has(k), k).toBe(true);
  });
  it("has 40-80 words and four tasks each, and no validation problems", () => {
    for (const t of readingTexts) {
      expect(wordCount(t.text), t.id).toBeGreaterThanOrEqual(40);
      expect(wordCount(t.text), t.id).toBeLessThanOrEqual(80);
      expect(t.tasks).toHaveLength(4);
    }
    expect(checkReadingTexts(readingTexts)).toEqual([]);
  });
  it("uses true/false, multiple choice and matching tasks", () => {
    const types = new Set(readingTexts.flatMap((t) => t.tasks.map((x) => x.type)));
    expect([...types].sort()).toEqual(["choice", "matching", "true-false"]);
    for (const t of readingTexts) {
      expect(t.tasks.some((x) => x.type === "matching"), t.id).toBe(true);
      expect(t.tasks.some((x) => x.type === "true-false"), t.id).toBe(true);
    }
  });
  it("has a correct answer for every task when answered from the data", () => {
    for (const t of readingTexts) {
      const responses = t.tasks.map((task) =>
        task.type === "matching" ? Object.fromEntries(task.pairs.map((p, i) => [i, p.answer])) : task.answer,
      );
      expect(scoreTasks(t.tasks, responses), t.id).toMatchObject({ correct: 4, passed: true });
    }
  });
  it("mixes true and false statements", () => {
    const answers = readingTexts.flatMap((t) => t.tasks.flatMap((x) => (x.type === "true-false" ? [x.answer] : [])));
    expect(answers.filter(Boolean).length).toBeGreaterThan(3);
    expect(answers.filter((a) => !a).length).toBeGreaterThan(3);
  });
  it("highlights the evidence inside the text", () => {
    const t = getReadingText("speisekarte")!;
    const task = t.tasks[0];
    if (task.type !== "true-false") throw new Error("expected true/false");
    const segs = highlightSegments(t.text, [task.evidence]);
    expect(segs.filter((s) => s.highlight).map((s) => s.text)).toEqual([task.evidence]);
  });
  it("looks texts up and finds neighbours", () => {
    expect(getReadingText("fahrplan")?.kind).toBe("timetable");
    expect(getReadingText("nope")).toBeUndefined();
    expect(getReadingNeighbours(readingTexts[0].id).prev).toBeNull();
    expect(getReadingNeighbours(readingTexts[9].id).next).toBeNull();
    expect(getReadingNeighbours("nope")).toEqual({ prev: null, next: null });
  });
});

describe("reading UI messages", () => {
  it("has the same keys in en, fa and de and a label for every kind", async () => {
    const [en, fa, de] = await Promise.all([
      import("../messages/en.json"),
      import("../messages/fa.json"),
      import("../messages/de.json"),
    ]);
    const paths = (o: unknown, p = ""): string[] =>
      typeof o !== "object" || o === null ? [p] : Object.entries(o).flatMap(([k, v]) => paths(v, p ? `${p}.${k}` : k));
    const base = paths(en.default.Reading).sort();
    expect(paths(fa.default.Reading).sort()).toEqual(base);
    expect(paths(de.default.Reading).sort()).toEqual(base);
    for (const k of READING_KINDS) expect((en.default.Reading.kinds as Record<string, string>)[k]).toBeTruthy();
  });
});
