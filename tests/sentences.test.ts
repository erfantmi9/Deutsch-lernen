import { describe, expect, it } from "vitest";
import {
  addToAnswer,
  applySentenceResult,
  checkOrder,
  initialBoard,
  moveInAnswer,
  pickSentence,
  removeFromAnswer,
  reorderAnswer,
} from "../lib/sentenceBoard";
import { filterSentences, getAvailableFoci, getSentence, sentences } from "../lib/sentences";
import { checkSentence } from "../lib/validation/rules";

const v2 = getSentence("s-v2-01")!; // Ich lerne heute Deutsch. / Heute lerne ich Deutsch.
const sep = getSentence("s-sep-01")!;

describe("checkOrder", () => {
  it("accepts the main order", () => {
    expect(checkOrder(["Ich", "lerne", "heute", "Deutsch."], v2)).toEqual({
      correct: true,
      wrongPositions: [],
      incomplete: false,
    });
  });
  it("accepts an alternative order, ignoring case and end punctuation", () => {
    expect(checkOrder(["heute", "lerne", "ich", "Deutsch."], v2).correct).toBe(true);
  });
  it("reports which positions are wrong", () => {
    const r = checkOrder(["Ich", "heute", "lerne", "Deutsch."], v2);
    expect(r.correct).toBe(false);
    expect(r.wrongPositions).toEqual([1, 2]);
  });
  it("flags an incomplete answer", () => {
    const r = checkOrder(["Ich", "lerne"], v2);
    expect(r).toMatchObject({ correct: false, incomplete: true, wrongPositions: [] });
  });
  it("marks an extra distractor as wrong", () => {
    const r = checkOrder(["Ich", "stehe", "um", "sieben", "Uhr", "aufstehe", "auf."], sep);
    expect(r.correct).toBe(false);
    expect(r.wrongPositions.length).toBeGreaterThan(0);
  });
});

describe("board operations", () => {
  const board = initialBoard(sep, () => 0.3);
  it("contains all tokens and distractors and does not start solved", () => {
    expect(board.bank).toHaveLength(sep.tokens.length + (sep.distractors?.length ?? 0));
    expect(board.answer).toEqual([]);
    const words = board.bank.filter((c) => !c.distractor).map((c) => c.text);
    expect(words).not.toEqual(sep.tokens);
  });
  it("adds, reorders and removes chips; removed chips return to their slot", () => {
    const [a, b, c] = board.bank;
    let s = addToAnswer(board, a.id);
    s = addToAnswer(s, b.id);
    s = addToAnswer(s, c.id, 0);
    expect(s.answer.map((x) => x.id)).toEqual([c.id, a.id, b.id]);
    s = moveInAnswer(s, c.id, 1);
    expect(s.answer.map((x) => x.id)).toEqual([a.id, c.id, b.id]);
    s = reorderAnswer(s, b.id, 0);
    expect(s.answer[0].id).toBe(b.id);
    s = removeFromAnswer(s, a.id);
    expect(s.bank.map((x) => x.order)).toEqual([...s.bank.map((x) => x.order)].sort((x, y) => x - y));
    expect(s.answer.some((x) => x.id === a.id)).toBe(false);
  });
});

describe("pickSentence", () => {
  it("never repeats the last sentence", () => {
    for (let i = 0; i < 100; i++) expect(pickSentence(sentences, [], [], "s-v2-01").id).not.toBe("s-v2-01");
  });
  it("prefers wrong sentences", () => {
    let hits = 0;
    const n = 3000;
    for (let i = 0; i < n; i++) if (pickSentence(sentences, [], ["s-q-01"], null).id === "s-q-01") hits++;
    // weighted: 4 / (4 + 14*2) = 12.5%; unweighted would be 1/15 = 6.7%
    expect(hits / n).toBeGreaterThan(0.1);
  });
});

describe("applySentenceResult", () => {
  const base = { solvedIds: [] as string[], wrongIds: [] as string[], streak: 0, bestStreak: 0 };
  it("first attempt correct raises streak and solves", () => {
    expect(applySentenceResult(base, "a", true, true)).toMatchObject({ solvedIds: ["a"], streak: 1, bestStreak: 1 });
  });
  it("first attempt wrong resets streak and records wrong id", () => {
    const s = applySentenceResult({ ...base, streak: 3, bestStreak: 3 }, "a", false, true);
    expect(s).toMatchObject({ streak: 0, bestStreak: 3, wrongIds: ["a"] });
  });
  it("a later correct retry solves it without touching the streak and clears the wrong id", () => {
    const wrong = applySentenceResult(base, "a", false, true);
    const fixed = applySentenceResult(wrong, "a", true, false);
    expect(fixed).toMatchObject({ solvedIds: ["a"], wrongIds: [], streak: 0 });
  });
  it("a later wrong retry changes nothing", () => {
    const wrong = applySentenceResult(base, "a", false, true);
    expect(applySentenceResult(wrong, "a", false, false)).toBe(wrong);
  });
});

describe("shipped sentence data", () => {
  it("has roles for every sentence, aligned with tokens", () => {
    for (const s of sentences) expect(s.roles).toHaveLength(s.tokens.length);
  });
  it("passes the validate rules with no problems", () => {
    for (const s of sentences) expect(checkSentence(s)).toEqual([]);
  });
  it("covers all 7 grammar foci and filters correctly", () => {
    expect(getAvailableFoci()).toHaveLength(7);
    expect(filterSentences("time-manner-place")).toHaveLength(3);
    expect(filterSentences("all")).toHaveLength(15);
  });
});
