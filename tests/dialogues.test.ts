import { describe, expect, it } from "vitest";
import { annotateLines, dialogueDistractors, dialogues, getDialogue, getDialogueNeighbours, resolveVocabIds } from "../lib/dialogues";
import { allQuestionsAnswered, scoreQuiz } from "../lib/dialogueLogic";
import { DialogueSchema } from "../lib/schemas/dialogue";
import { checkDialogues } from "../lib/validation/contentRules";
import { buildChoices, buildRolePlayChoices, distractorPool, isQuestionLine, MIN_DISTRACTOR_WORDS, speakersOf } from "../lib/rolePlay";
import { annotate, buildWordIndex, lookupWord, tokenize } from "../lib/wordLookup";
import { hashString, mulberry32, seededShuffle } from "../lib/shuffle";
import { addUnique, applyScore, bestScore, isPassed, PASS_MARK, passedFraction } from "../lib/scoreStats";
import { grammarLessons } from "../lib/grammar";
import { vocab } from "../lib/vocab";
import { verbs } from "../lib/verbs";
import { DIALOGUE_TOPICS } from "../types/dialogue";

const i3 = { en: "a", fa: "ب", de: "c" };
const quizQ = { question: i3, options: ["a", "b", "c"], answer: "a" };
const valid = {
  id: "t",
  topic: "weather",
  title: i3,
  setting: i3,
  lines: ["A", "B", "A", "B", "A", "B"].map((speaker, i) => ({ speaker, de: `Satz ${i}.`, en: "x", fa: "ی" })),
  quiz: [quizQ, quizQ, quizQ, quizQ],
};

function seeded(seed: number) {
  return mulberry32(seed);
}

describe("dialogue schema", () => {
  it("accepts a valid dialogue", () => {
    expect(DialogueSchema.safeParse(valid).success).toBe(true);
  });
  it("needs 6-10 lines, exactly two speakers and four quiz questions", () => {
    expect(DialogueSchema.safeParse({ ...valid, lines: valid.lines.slice(0, 5) }).success).toBe(false);
    expect(DialogueSchema.safeParse({ ...valid, lines: [...valid.lines, ...valid.lines] }).success).toBe(false);
    expect(DialogueSchema.safeParse({ ...valid, lines: valid.lines.map((l, i) => ({ ...l, speaker: i === 0 ? "C" : l.speaker })) }).success).toBe(false);
    expect(DialogueSchema.safeParse({ ...valid, quiz: [quizQ] }).success).toBe(false);
  });
  it("needs the answer among the options and no duplicate options", () => {
    const bad = { ...valid, quiz: [{ ...quizQ, answer: "z" }, quizQ, quizQ, quizQ] };
    expect(DialogueSchema.safeParse(bad).success).toBe(false);
    const dup = { ...valid, quiz: [{ ...quizQ, options: ["a", "A", "c"] }, quizQ, quizQ, quizQ] };
    expect(DialogueSchema.safeParse(dup).success).toBe(false);
  });
  it("rejects an unknown topic and empty text", () => {
    expect(DialogueSchema.safeParse({ ...valid, topic: "sport" }).success).toBe(false);
    expect(DialogueSchema.safeParse({ ...valid, setting: { ...i3, fa: " " } }).success).toBe(false);
  });
});

const known = {
  nounIds: new Set(vocab.map((v) => v.id)),
  verbIds: new Set(verbs.map((v) => v.id)),
  lessonIds: new Set(grammarLessons.map((l) => l.id)),
};
const errorsOf = (d: unknown) => checkDialogues([DialogueSchema.parse(d)], known).filter((p) => p.problem.severity === "error");

describe("checkDialogues", () => {
  it("passes a consistent dialogue", () => {
    expect(errorsOf({ ...valid, vocabIds: ["noun:tisch", "verb:sein"], grammarLessonIds: ["pronouns"] })).toEqual([]);
  });
  it("flags unknown and malformed vocab ids and lessons", () => {
    const messages = errorsOf({ ...valid, vocabIds: ["noun:nope", "verb:nope", "tisch"], grammarLessonIds: ["nope"] }).map((p) => p.problem.message);
    expect(messages.some((m) => m.includes('unknown noun "nope"'))).toBe(true);
    expect(messages.some((m) => m.includes('unknown verb "nope"'))).toBe(true);
    expect(messages.some((m) => m.includes("must look like"))).toBe(true);
    expect(messages.some((m) => m.includes('unknown grammar lesson "nope"'))).toBe(true);
  });
});

describe("shipped dialogues", () => {
  it("has 12 dialogues that cover all ten topics", () => {
    expect(dialogues).toHaveLength(12);
    const topics = new Set(dialogues.map((d) => d.topic));
    for (const t of DIALOGUE_TOPICS) expect(topics.has(t), t).toBe(true);
  });
  it("has 6-10 lines, two speakers and four questions each, and no validation problems", () => {
    for (const d of dialogues) {
      expect(d.lines.length).toBeGreaterThanOrEqual(6);
      expect(d.lines.length).toBeLessThanOrEqual(10);
      expect(speakersOf(d.lines)).toHaveLength(2);
      expect(d.quiz).toHaveLength(4);
    }
    expect(checkDialogues(dialogues, known)).toEqual([]);
  });
  it("looks dialogues up and finds neighbours", () => {
    expect(getDialogue("im-cafe")?.topic).toBe("order-food");
    expect(getDialogue("nope")).toBeUndefined();
    expect(getDialogueNeighbours(dialogues[0].id).prev).toBeNull();
    expect(getDialogueNeighbours(dialogues[11].id).next).toBeNull();
    expect(getDialogueNeighbours(dialogues[3].id).prev?.id).toBe(dialogues[2].id);
    expect(getDialogueNeighbours("nope")).toEqual({ prev: null, next: null });
  });
  it("resolves vocabulary ids and skips unknown ones", () => {
    const words = resolveVocabIds(["noun:broetchen", "verb:gehen", "noun:nope", "x:y"]);
    expect(words.map((w) => w.display)).toEqual(["das Brötchen", "gehen"]);
    expect(resolveVocabIds(undefined)).toEqual([]);
  });
  it("annotates known words and leaves the rest alone", () => {
    const line = annotateLines(getDialogue("beim-baecker")!)[1];
    const hits = line.tokens.filter((t) => t.hit).map((t) => t.hit!.display);
    expect(hits).toContain("das Brötchen");
    expect(line.tokens.map((t) => t.text).join("")).toBe(line.de);
  });
  it("builds a distractor pool from other topics only", () => {
    const d = getDialogue("im-cafe")!;
    const pool = dialogueDistractors(d);
    const own = new Set(d.lines.map((l) => l.de));
    const sameTopic = new Set(dialogues.filter((x) => x.topic === d.topic).flatMap((x) => x.lines.map((l) => l.de)));
    expect(pool.length).toBeGreaterThan(30);
    for (const p of pool) {
      expect(own.has(p)).toBe(false);
      expect(sameTopic.has(p)).toBe(false);
      expect(p.split(/\s+/u).length).toBeGreaterThanOrEqual(MIN_DISTRACTOR_WORDS);
    }
  });
});

describe("quiz scoring", () => {
  const quiz = [{ answer: "a" }, { answer: "b" }, { answer: "c" }, { answer: "d" }];
  it("counts correct answers and applies the pass mark", () => {
    expect(scoreQuiz(quiz, ["a", "b", "c", "d"])).toMatchObject({ correct: 4, total: 4, passed: true });
    expect(scoreQuiz(quiz, ["a", "b", "c", "x"])).toMatchObject({ correct: 3, passed: true });
    expect(scoreQuiz(quiz, ["a", "b", "x", "x"])).toMatchObject({ correct: 2, passed: false });
    expect(scoreQuiz(quiz, [null, null, null, null])).toMatchObject({ correct: 0, passed: false });
    expect(scoreQuiz(quiz, ["a"]).perQuestion).toEqual([true, false, false, false]);
  });
  it("knows when every question is answered", () => {
    expect(allQuestionsAnswered(quiz, ["a", "b", "c", "d"])).toBe(true);
    expect(allQuestionsAnswered(quiz, ["a", null, "c", "d"])).toBe(false);
    expect(allQuestionsAnswered(quiz, ["a"])).toBe(false);
    expect(allQuestionsAnswered([], [])).toBe(false);
  });
});

describe("score stats", () => {
  it("keeps the best score and counts attempts", () => {
    let m = applyScore({}, "x", 2);
    m = applyScore(m, "x", 4);
    m = applyScore(m, "x", 1);
    expect(m.x).toEqual({ best: 4, attempts: 3 });
    expect(bestScore(m, "x")).toBe(4);
    expect(bestScore(m, "y")).toBeNull();
  });
  it("passes at the pass mark and reports the passed share", () => {
    let m = applyScore({}, "a", PASS_MARK - 1);
    expect(isPassed(m, "a")).toBe(false);
    m = applyScore(m, "a", PASS_MARK);
    m = applyScore(m, "b", 4);
    expect(isPassed(m, "a")).toBe(true);
    expect(passedFraction(["a", "b", "c", "d"], m)).toBe(0.5);
    expect(passedFraction([], m)).toBe(0);
  });
  it("adds ids without duplicates or mutation", () => {
    const list = ["a"];
    expect(addUnique(list, "b")).toEqual(["a", "b"]);
    expect(addUnique(list, "a")).toEqual(["a"]);
    expect(list).toEqual(["a"]);
  });
});

describe("shuffle", () => {
  it("is deterministic per seed and always a permutation", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(seededShuffle(items, "x")).toEqual(seededShuffle(items, "x"));
    expect([...seededShuffle(items, "x")].sort()).toEqual(items);
    const orders = new Set(Array.from({ length: 30 }, (_, i) => seededShuffle(items, `seed-${i}`).join()));
    expect(orders.size).toBeGreaterThan(5);
    expect(items).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("hashes strings and keeps rng values in [0, 1)", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it("moves the first option away from position 0 for some quiz questions", () => {
    const positions = dialogues.flatMap((d) =>
      d.quiz.map((q, i) => seededShuffle(q.options, `${d.id}:${i}`).indexOf(q.answer)),
    );
    expect(new Set(positions).size).toBeGreaterThan(1);
  });
});

describe("role-play", () => {
  const pool = dialogueDistractors(getDialogue("im-cafe")!);
  it("builds three unique choices that contain the correct reply", () => {
    for (let i = 0; i < 200; i++) {
      const correct = "Ich möchte einen Tee, bitte.";
      const choices = buildChoices(correct, pool, seeded(i));
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      expect(choices.filter((c) => c === correct)).toHaveLength(1);
    }
  });
  it("prefers distractors of the same kind (question or statement)", () => {
    for (let i = 0; i < 100; i++) {
      const choices = buildChoices("Wie heißt du?", pool, seeded(i));
      expect(choices.every(isQuestionLine)).toBe(true);
      const statement = buildChoices("Das ist gut.", pool, seeded(i));
      expect(statement.some(isQuestionLine)).toBe(false);
    }
  });
  it("falls back to other kinds when the pool is small and never invents choices", () => {
    expect(buildChoices("A?", ["B.", "C."], seeded(1)).sort()).toEqual(["A?", "B.", "C."]);
    expect(buildChoices("A?", ["B."], seeded(1)).sort()).toEqual(["A?", "B."]);
    expect(buildChoices("A?", [], seeded(1))).toEqual(["A?"]);
  });
  it("only offers choices for the learner's own lines", () => {
    const d = getDialogue("im-cafe")!;
    const choices = buildRolePlayChoices(d.lines, "Mia", pool, seeded(5));
    const own = d.lines.flatMap((l, i) => (l.speaker === "Mia" ? [i] : []));
    expect(Object.keys(choices).map(Number)).toEqual(own);
    for (const i of own) expect(choices[i]).toContain(d.lines[i].de);
  });
  it("builds pools without the current dialogue or topic", () => {
    const p = distractorPool(
      [
        { id: "a", topic: "x", lines: [{ de: "Das ist mein Haus." }] },
        { id: "b", topic: "y", lines: [{ de: "Wie geht es dir?" }, { de: "Ja." }] },
        { id: "c", topic: "x", lines: [{ de: "Ich lerne heute Deutsch." }] },
      ],
      { id: "a", topic: "x" },
    );
    expect(p).toEqual(["Wie geht es dir?"]);
  });
});

describe("word lookup", () => {
  const index = buildWordIndex(vocab, verbs);
  it("finds nouns case-sensitively, including plurals", () => {
    expect(lookupWord(index, "Brötchen")?.display).toBe("das Brötchen");
    expect(lookupWord(index, "Bücher")).toMatchObject({ display: "das Buch", inflected: true });
    expect(lookupWord(index, "brötchen")).toBeNull();
    expect(lookupWord(index, "Bahnhof")?.translations.en).toBeTruthy();
  });
  it("finds verbs in any form, case-insensitively", () => {
    expect(lookupWord(index, "wohne")).toMatchObject({ display: "wohnen", inflected: true });
    expect(lookupWord(index, "heißt")?.display).toBe("heißen");
    expect(lookupWord(index, "gegangen")?.display).toBe("gehen");
    expect(lookupWord(index, "gehen")).toMatchObject({ display: "gehen", inflected: false });
  });
  it("allows a capitalised verb only at the start of a sentence", () => {
    expect(lookupWord(index, "Gehen", true)?.display).toBe("gehen");
    expect(lookupWord(index, "Gehen", false)).toBeNull();
  });
  it("returns null for unknown words and empty input", () => {
    expect(lookupWord(index, "Zauberer")).toBeNull();
    expect(lookupWord(index, "")).toBeNull();
  });
  it("tokenizes lines without losing characters and marks sentence starts", () => {
    const line = "Guten Morgen! Ich möchte vier Brötchen, bitte.";
    const tokens = tokenize(line);
    expect(tokens.map((t) => t.text).join("")).toBe(line);
    const starts = tokens.filter((t) => t.sentenceStart).map((t) => t.text);
    expect(starts).toEqual(["Guten", "Ich"]);
    expect(annotate(index, line).filter((t) => t.hit).map((t) => t.hit!.display)).toContain("das Brötchen");
  });
  it("keeps hyphenated words and umlauts together", () => {
    expect(tokenize("Straße-Nummer ä").filter((t) => t.isWord).map((t) => t.text)).toEqual(["Straße-Nummer", "ä"]);
  });
});

describe("dialogue UI messages", () => {
  it("has the same keys in en, fa and de and a label for every topic", async () => {
    const [en, fa, de] = await Promise.all([
      import("../messages/en.json"),
      import("../messages/fa.json"),
      import("../messages/de.json"),
    ]);
    const paths = (o: unknown, p = ""): string[] =>
      typeof o !== "object" || o === null ? [p] : Object.entries(o).flatMap(([k, v]) => paths(v, p ? `${p}.${k}` : k));
    const base = paths(en.default.Dialogues).sort();
    expect(paths(fa.default.Dialogues).sort()).toEqual(base);
    expect(paths(de.default.Dialogues).sort()).toEqual(base);
    for (const t of DIALOGUE_TOPICS) expect((en.default.Dialogues.topics as Record<string, string>)[t]).toBeTruthy();
  });
});
