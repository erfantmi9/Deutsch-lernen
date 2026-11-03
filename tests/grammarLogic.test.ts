import { describe, expect, it } from "vitest";
import {
  applyGrammarResult,
  buildPracticeQueue,
  checkGrammarAnswer,
  EMPTY_STATS,
  isLessonComplete,
  lessonProgress,
  overallProgress,
  withLessonCompletion,
} from "../lib/grammarLogic";
import { fillGap, glossLabel, glossaryMap, highlightSegments, parseCell, splitAtGap } from "../lib/grammarText";
import { parseBlocks, parseInline, parseRuns, plainText } from "../lib/miniMarkdown";
import { getExercise, glossary } from "../lib/grammar";
import type { GrammarExercise } from "../types/grammar";

const i3 = { en: "a", fa: "ب", de: "c" };
const choice: GrammarExercise = {
  id: "c1",
  lessonId: "l",
  type: "choice",
  prompt: i3,
  sentenceDe: "Ich habe ___ Hund.",
  options: ["ein", "einen", "eine"],
  answer: "einen",
  explanation: i3,
};
const fill: GrammarExercise = { ...choice, id: "f1", type: "fill", options: undefined, answer: "Stühle", sentenceDe: "der Stuhl → die ___" };

describe("checkGrammarAnswer", () => {
  it("checks choice answers case-insensitively and rejects empty input", () => {
    expect(checkGrammarAnswer(choice, "einen")).toBe("correct");
    expect(checkGrammarAnswer(choice, "EINEN")).toBe("correct");
    expect(checkGrammarAnswer(choice, "ein")).toBe("wrong");
    expect(checkGrammarAnswer(choice, "")).toBe("wrong");
  });
  it("trims and ignores case for typed answers", () => {
    expect(checkGrammarAnswer(fill, "  stühle ")).toBe("correct");
  });
  it("flags umlaut-only mistakes and keeps ß/umlauts strict", () => {
    expect(checkGrammarAnswer(fill, "Stuhle")).toBe("umlaut");
    expect(checkGrammarAnswer(fill, "Stuehle")).toBe("wrong");
    expect(checkGrammarAnswer(fill, "Stühl")).toBe("wrong");
    expect(checkGrammarAnswer({ ...fill, answer: "heißt" }, "heisst")).toBe("umlaut");
  });
  it("accepts alternative answers", () => {
    const e = { ...fill, answer: "Autos", acceptedAnswers: ["Auto's"] };
    expect(checkGrammarAnswer(e, "Auto's")).toBe("correct");
  });
  it("works on shipped exercises", () => {
    const ex = getExercise("case-01")!;
    expect(checkGrammarAnswer(ex, "einen")).toBe("correct");
    expect(checkGrammarAnswer(ex, "ein")).toBe("wrong");
    expect(checkGrammarAnswer(getExercise("plur-05")!, "stuhle")).toBe("umlaut");
  });
});

describe("applyGrammarResult", () => {
  it("tracks attempts, correct count, streak and wrong ids", () => {
    const a = applyGrammarResult(EMPTY_STATS, "x", true);
    expect(a.results.x).toEqual({ attempts: 1, correct: 1, lastCorrect: true });
    expect(a).toMatchObject({ streak: 1, bestStreak: 1, wrongIds: [] });

    const b = applyGrammarResult(a, "y", false);
    expect(b).toMatchObject({ streak: 0, bestStreak: 1, wrongIds: ["y"] });
    expect(applyGrammarResult(b, "y", false).wrongIds).toEqual(["y"]);

    const c = applyGrammarResult(b, "y", true);
    expect(c.wrongIds).toEqual([]);
    expect(c.results.y).toEqual({ attempts: 2, correct: 1, lastCorrect: true });
  });
  it("does not mutate the previous state", () => {
    const before = applyGrammarResult(EMPTY_STATS, "x", false);
    const snapshot = JSON.stringify(before);
    applyGrammarResult(before, "x", true);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(EMPTY_STATS.wrongIds).toEqual([]);
  });
});

describe("lesson progress", () => {
  const ids = ["a", "b", "c", "d"];
  it("counts an exercise as solved after one correct answer", () => {
    let s = applyGrammarResult(EMPTY_STATS, "a", true);
    s = applyGrammarResult(s, "b", false);
    expect(lessonProgress(ids, s.results)).toEqual({ solved: 1, total: 4, fraction: 0.25 });
    s = applyGrammarResult(s, "b", true);
    expect(lessonProgress(ids, s.results).solved).toBe(2);
  });
  it("handles empty lessons", () => {
    expect(lessonProgress([], {})).toEqual({ solved: 0, total: 0, fraction: 0 });
    expect(isLessonComplete([], {})).toBe(false);
    expect(overallProgress([], {})).toBe(0);
  });
  it("marks a lesson complete only when every exercise is solved, and never un-completes it", () => {
    let s = EMPTY_STATS;
    for (const id of ids.slice(0, 3)) s = applyGrammarResult(s, id, true);
    expect(withLessonCompletion(s, "L", ids).completedLessonIds).toEqual([]);
    s = applyGrammarResult(s, "d", true);
    s = withLessonCompletion(s, "L", ids);
    expect(s.completedLessonIds).toEqual(["L"]);
    s = applyGrammarResult(s, "a", false);
    expect(withLessonCompletion(s, "L", ids).completedLessonIds).toEqual(["L"]);
    expect(withLessonCompletion(s, "L", ids)).toBe(s);
  });
  it("computes overall progress across lessons", () => {
    const s = applyGrammarResult(applyGrammarResult(EMPTY_STATS, "a", true), "c", true);
    expect(overallProgress([{ exerciseIds: ["a", "b"] }, { exerciseIds: ["c", "d"] }], s.results)).toBe(0.5);
  });
});

describe("buildPracticeQueue", () => {
  const exs = ["a", "b", "c", "d", "e"].map((id) => ({ ...choice, id }));
  const rng = () => 0.5;
  it("puts wrong exercises first, then unsolved, then solved", () => {
    let s = EMPTY_STATS;
    s = applyGrammarResult(s, "a", true);
    s = applyGrammarResult(s, "b", false);
    s = applyGrammarResult(s, "c", true);
    const queue = buildPracticeQueue(exs, s, rng).map((e) => e.id);
    expect(queue[0]).toBe("b");
    expect(queue.slice(1, 3).sort()).toEqual(["d", "e"]);
    expect(queue.slice(3).sort()).toEqual(["a", "c"]);
  });
  it("contains every exercise exactly once and does not mutate its input", () => {
    const copy = [...exs];
    const queue = buildPracticeQueue(exs, EMPTY_STATS);
    expect(queue.map((e) => e.id).sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(exs).toEqual(copy);
  });
  it("shuffles within a group", () => {
    const orders = new Set<string>();
    for (let i = 0; i < 60; i++) orders.add(buildPracticeQueue(exs, EMPTY_STATS).map((e) => e.id).join());
    expect(orders.size).toBeGreaterThan(5);
  });
  it("handles an empty list and a rng that returns 1", () => {
    expect(buildPracticeQueue([], EMPTY_STATS)).toEqual([]);
    expect(buildPracticeQueue(exs, EMPTY_STATS, () => 0.999999)).toHaveLength(5);
  });
});

describe("grammarText helpers", () => {
  it("splits and fills the gap", () => {
    expect(splitAtGap("Ich habe ___ Hund.")).toEqual({ before: "Ich habe ", after: " Hund." });
    expect(fillGap("Ich habe ___ Hund.", "einen")).toBe("Ich habe einen Hund.");
    expect(fillGap("no gap", "x")).toBe("no gap");
    expect(splitAtGap("no gap")).toEqual({ before: "no gap", after: "" });
  });
  it("highlights every occurrence and merges overlaps", () => {
    expect(highlightSegments("Der Mann liest den Brief.", ["Der Mann", "den Brief"])).toEqual([
      { text: "Der Mann", highlight: true },
      { text: " liest ", highlight: false },
      { text: "den Brief", highlight: true },
      { text: ".", highlight: false },
    ]);
    expect(highlightSegments("aaa", ["aa"])).toEqual([{ text: "aaa", highlight: true }]);
    expect(highlightSegments("Hallo", undefined)).toEqual([{ text: "Hallo", highlight: false }]);
    expect(highlightSegments("Hallo", ["xyz"])).toEqual([{ text: "Hallo", highlight: false }]);
  });
  it("parses table cells", () => {
    expect(parseCell("gloss:nominative")).toEqual({ kind: "gloss", term: "nominative" });
    expect(parseCell("**den** / einen")).toEqual({
      kind: "text",
      runs: [
        { text: "den", bold: true },
        { text: " / einen", bold: false },
      ],
    });
  });
  it("labels glossary terms per locale", () => {
    const entry = glossaryMap(glossary).get("accusative")!;
    expect(glossLabel(entry, "en")).toEqual({ label: "accusative", german: "Akkusativ" });
    expect(glossLabel(entry, "fa")).toEqual({ label: "حالت مفعولی", german: "Akkusativ" });
    expect(glossLabel(entry, "de")).toEqual({ label: "Akkusativ", german: null });
  });
});

describe("miniMarkdown", () => {
  it("splits bold runs and keeps unbalanced markers literal", () => {
    expect(parseRuns("a **b** c")).toEqual([
      { text: "a ", bold: false },
      { text: "b", bold: true },
      { text: " c", bold: false },
    ]);
    expect(parseRuns("a ** b")).toEqual([{ text: "a ** b", bold: false }]);
  });
  it("marks German spans", () => {
    const nodes = parseInline("Say `der Tisch` now");
    expect(nodes.map((n) => n.kind)).toEqual(["text", "de", "text"]);
    expect(plainText(nodes)).toBe("Say der Tisch now");
    expect(parseInline("a ` b")).toEqual([{ kind: "text", runs: [{ text: "a ` b", bold: false }] }]);
  });
  it("parses paragraphs and lists", () => {
    const blocks = parseBlocks("First line\nsecond line\n\n- one\n- two `x`\n\nLast");
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "list", "paragraph"]);
    const list = blocks[1];
    expect(list.kind === "list" && list.items).toHaveLength(2);
    const first = blocks[0];
    expect(first.kind === "paragraph" && plainText(first.inline)).toBe("First line second line");
  });
  it("ends a paragraph when a list starts and vice versa", () => {
    expect(parseBlocks("Intro:\n- a\n- b\nOutro").map((b) => b.kind)).toEqual(["paragraph", "list", "paragraph"]);
    expect(parseBlocks("")).toEqual([]);
  });
  it("parses every shipped lesson body without leaving markers behind", () => {
    // Imported lazily to keep this file focused on the pure helpers.
    return import("../lib/grammar").then(({ grammarLessons }) => {
      for (const lesson of grammarLessons) {
        for (const section of lesson.sections) {
          for (const loc of ["en", "fa", "de"] as const) {
            const text = parseBlocks(section.body[loc])
              .map((b) => (b.kind === "paragraph" ? plainText(b.inline) : b.items.map(plainText).join(" ")))
              .join(" ");
            expect(text, `${lesson.id}/${loc}`).not.toMatch(/\*\*|`/u);
          }
        }
      }
    });
  });
});
