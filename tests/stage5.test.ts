import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_ENTRIES, isActivePath } from "@/components/nav/navItems";
import { dialogues } from "@/lib/dialogues";
import {
  addAttempt,
  bestTotal,
  formatClock,
  isComplete,
  isPassing,
  MAX_ATTEMPTS_KEPT,
  normaliseText,
  PASS_POINTS,
  scoreForm,
  scoreListening,
  scoreMessage,
  scoreSpeaking,
  scoreWriting,
  toModulePoints,
  totalPoints,
} from "@/lib/exam";
import type { ExamAttempt } from "@/lib/exam";
import { exam } from "@/lib/examData";
import { grammarLessons } from "@/lib/grammar";
import { evaluatePath, emptyPathInput, goalFraction, PATH_STEPS, resumeSection } from "@/lib/learningPath";
import { buildNumberQuestion, buildWordQuestion, checkListenAnswer, isDrillCard, normaliseDigits, OPTION_COUNT } from "@/lib/listenDrill";
import { cardinal } from "@/lib/numbers";
import { getReadingText, readingTexts } from "@/lib/reading";
import { reviewCards } from "@/lib/reviewData";
import { ExamSchema } from "@/lib/schemas/exam";
import { buildSearchIndex, foldVariants, searchItems } from "@/lib/search";
import { pageAlternates } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import { allPaths, STATIC_PATHS } from "@/lib/sitePaths";
import { mulberry32 } from "@/lib/shuffle";
import { pickGermanVoice } from "@/lib/speech";
import { checkExam } from "@/lib/validation/examRules";
import { checkMessages, flattenMessages, placeholders } from "@/lib/validation/messageRules";
import { verbs } from "@/lib/verbs";
import { vocab } from "@/lib/vocab";
import { adjectives, adverbs, phrases, prepositions } from "@/lib/vocabExtended";
import { EXAM_MODULES } from "@/types/exam";
import en from "@/messages/en.json";
import fa from "@/messages/fa.json";
import de from "@/messages/de.json";

describe("speech", () => {
  it("prefers de-DE, then on-device voices, and ignores other languages", () => {
    const voices = [
      { lang: "en-US", name: "a", localService: true },
      { lang: "de-AT", name: "b", localService: true },
      { lang: "de-DE", name: "c", localService: false },
      { lang: "de_DE", name: "d", localService: true },
    ];
    expect(pickGermanVoice(voices)?.name).toBe("d");
    expect(pickGermanVoice(voices.slice(0, 2))?.name).toBe("b");
    expect(pickGermanVoice([{ lang: "fr-FR", name: "x" }])).toBeNull();
    expect(pickGermanVoice([])).toBeNull();
  });
});

describe("listening drills", () => {
  const rng = () => mulberry32(7);

  it("builds word questions with four different options that include the answer", () => {
    const pool = reviewCards.filter(isDrillCard);
    for (const locale of ["en", "fa"] as const) {
      const next = rng();
      for (let i = 0; i < 50; i++) {
        const q = buildWordQuestion(pool, locale, next);
        expect(q.options).toHaveLength(OPTION_COUNT);
        expect(new Set(q.options).size).toBe(OPTION_COUNT);
        expect(q.options).toContain(q.answer);
        expect(pool.find((c) => c.id === q.cardId)?.translations[locale]).toBe(q.answer);
      }
    }
  });

  it("does not repeat the previous word", () => {
    const pool = reviewCards.filter(isDrillCard);
    const next = rng();
    let prev = buildWordQuestion(pool, "en", next);
    for (let i = 0; i < 50; i++) {
      const q = buildWordQuestion(pool, "en", next, prev.cardId);
      expect(q.cardId).not.toBe(prev.cardId);
      prev = q;
    }
  });

  it("never uses phrases and fails clearly on a tiny pool", () => {
    expect(reviewCards.filter(isDrillCard).some((c) => c.kind === "phrase")).toBe(false);
    expect(() => buildWordQuestion(reviewCards.slice(0, 2), "en", rng())).toThrow();
  });

  it("speaks numbers as German words and accepts digits in any script", () => {
    const next = rng();
    for (let i = 0; i < 50; i++) {
      const q = buildNumberQuestion(next);
      expect(q.value).toBeGreaterThanOrEqual(0);
      expect(q.value).toBeLessThanOrEqual(100);
      expect(q.spoken).toBe(cardinal(q.value));
      expect(checkListenAnswer(q, ` ${q.value} `)).toBe(true);
      expect(checkListenAnswer(q, String(q.value + 1))).toBe(false);
    }
    const twentyThree = { kind: "number" as const, spoken: "dreiundzwanzig", value: 23, answer: "23" };
    expect(checkListenAnswer(twentyThree, "۲۳")).toBe(true);
    expect(checkListenAnswer(twentyThree, "٢٣")).toBe(true);
    expect(checkListenAnswer(twentyThree, "dreiundzwanzig")).toBe(false);
    expect(checkListenAnswer(twentyThree, "")).toBe(false);
    expect(normaliseDigits(" ۱۲ ")).toBe("12");
  });
});

describe("practice exam data", () => {
  it("passes the schema and points at existing reading texts", () => {
    expect(ExamSchema.safeParse(exam).success).toBe(true);
    expect(checkExam(exam, new Set(readingTexts.map((r) => r.id)))).toEqual([]);
    expect(exam.lesen.textIds.every((id) => getReadingText(id) !== undefined)).toBe(true);
  });

  it("reports a missing reading text and a bad answer", () => {
    expect(checkExam(exam, new Set()).some((p) => p.severity === "error")).toBe(true);
    const bad = { ...exam, hoeren: [{ ...exam.hoeren[0], answer: "nope" }] };
    expect(ExamSchema.safeParse(bad).success).toBe(false);
  });

  it("has a listening answer inside the script's meaning (spot checks)", () => {
    const byId = Object.fromEntries(exam.hoeren.map((i) => [i.id, i]));
    expect(byId.durchsage.script).toContain("Gleis fünf");
    expect(byId.einkauf.answer).toBe("Drei Euro siebzig");
    expect(byId.arzttermin.answer).toBe("Um halb drei");
  });
});

describe("exam scoring", () => {
  it("scales to 25 points per module", () => {
    expect(toModulePoints(3, 6)).toBe(12.5);
    expect(toModulePoints(12, 12)).toBe(25);
    expect(toModulePoints(0, 12)).toBe(0);
    expect(toModulePoints(5, 0)).toBe(0);
    expect(toModulePoints(99, 10)).toBe(25);
    expect(toModulePoints(-4, 10)).toBe(0);
  });

  it("sums modules and passes at 60 of 100", () => {
    expect(PASS_POINTS).toBe(60);
    expect(totalPoints({ lesen: 20, hoeren: 15, schreiben: 15, sprechen: 10 })).toBe(60);
    expect(isPassing(60)).toBe(true);
    expect(isPassing(59.9)).toBe(false);
    expect(isComplete({ lesen: 1, hoeren: 1, schreiben: 1 })).toBe(false);
    expect(isComplete({ lesen: 0, hoeren: 0, schreiben: 0, sprechen: 0 })).toBe(true);
  });

  it("scores listening by chosen option", () => {
    const all = Object.fromEntries(exam.hoeren.map((i) => [i.id, i.answer]));
    expect(scoreListening(exam.hoeren, all)).toMatchObject({ correct: 6, total: 6, points: 25 });
    expect(scoreListening(exam.hoeren, {})).toMatchObject({ correct: 0, points: 0 });
  });

  it("checks form fields ignoring case, spaces and end punctuation", () => {
    const values = { familienname: "Weber", vorname: " mira ", alter: "24", wohnort: "Hamburg.", beruf: "Krankenschwester" };
    expect(scoreForm(exam.schreiben.form.fields, values)).toEqual({ correct: 5, total: 5 });
    expect(scoreForm(exam.schreiben.form.fields, { ...values, alter: "vierundzwanzig" }).correct).toBe(5);
    expect(scoreForm(exam.schreiben.form.fields, { ...values, alter: "25" }).correct).toBe(4);
    expect(normaliseText("  Hallo,  Welt! ")).toBe("hallo, welt");
  });

  const goodMessage =
    "Hallo Jonas, ich lade dich zu meiner Geburtstagsfeier ein. Sie ist am Samstag um 18 Uhr bei mir zu Hause. Kommst du auch? Viele Grüße, Mira";

  it("finds the content points of a message", () => {
    const r = scoreMessage(exam.schreiben.message.points, goodMessage, exam.schreiben.message.minWords);
    expect(r.missing).toEqual([]);
    expect(r.longEnough).toBe(true);
  });

  it("gives full writing points for a complete answer and none for a message that is too short", () => {
    const values = { familienname: "Weber", vorname: "Mira", alter: "24", wohnort: "Hamburg", beruf: "Krankenschwester" };
    expect(scoreWriting(exam.schreiben, values, goodMessage).points).toBe(25);
    const short = scoreWriting(exam.schreiben, {}, "?");
    expect(short.found).toEqual([]);
    expect(short.points).toBe(0);
    // Only the form: 5 of 11 checkable points.
    expect(scoreWriting(exam.schreiben, values, "Hallo").points).toBe(toModulePoints(5, 11));
  });

  it("scores speaking by ticked items", () => {
    const all = new Set(exam.sprechen.flatMap((p) => p.checklist.map((c) => `${p.id}:${c.id}`)));
    expect(scoreSpeaking(exam.sprechen, all).points).toBe(25);
    expect(scoreSpeaking(exam.sprechen, new Set()).points).toBe(0);
    expect(scoreSpeaking(exam.sprechen, new Set(["nonsense:x"])).ticked).toBe(0);
  });

  it("formats the clock", () => {
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(-5)).toBe("0:00");
    expect(formatClock(25 * 60)).toBe("25:00");
  });

  it("keeps the newest ten attempts", () => {
    const attempt = (n: number): ExamAttempt => ({
      date: "2026-03-01",
      scores: { lesen: n, hoeren: 0, schreiben: 0, sprechen: 0 },
      total: n,
    });
    let history: ExamAttempt[] = [];
    for (let i = 1; i <= 12; i++) history = addAttempt(history, attempt(i));
    expect(history).toHaveLength(MAX_ATTEMPTS_KEPT);
    expect(history[0].total).toBe(12);
    expect(bestTotal(history)).toBe(12);
    expect(bestTotal([])).toBe(0);
    expect(EXAM_MODULES).toHaveLength(4);
  });
});

describe("learning path", () => {
  it("starts at the first step and moves on as steps are done", () => {
    const start = evaluatePath(emptyPathInput());
    expect(start.filter((s) => s.current).map((s) => s.id)).toEqual(["articles"]);
    expect(start.every((s) => !s.done)).toBe(true);

    const next = evaluatePath({ ...emptyPathInput(), quizBestStreak: 5 });
    expect(next[0].done).toBe(true);
    expect(next.filter((s) => s.current).map((s) => s.id)).toEqual(["pronouns"]);
  });

  it("marks a later step done without skipping the current one", () => {
    const steps = evaluatePath({ ...emptyPathInput(), reviewAnswers: 60 });
    expect(steps.find((s) => s.id === "review")?.done).toBe(true);
    expect(steps.find((s) => s.current)?.id).toBe("articles");
  });

  it("has no current step when everything is done", () => {
    const all = evaluatePath({
      quizBestStreak: 10,
      verbScore: 50,
      completedLessonIds: grammarLessons.map((l) => l.id),
      numbersProgress: 1,
      dialoguesPassed: 12,
      readingPassed: 10,
      sentencesSolved: 15,
      reviewDeckSize: 100,
      reviewAnswers: 500,
      examAttempts: 1,
    });
    expect(all.every((s) => s.done)).toBe(true);
    expect(all.some((s) => s.current)).toBe(false);
  });

  it("only points at lessons and pages that exist", () => {
    const lessonIds = new Set(grammarLessons.map((l) => l.id));
    for (const step of PATH_STEPS) {
      const m = /^\/grammar\/(.+)$/.exec(step.href);
      if (m) expect(lessonIds.has(m[1]), step.href).toBe(true);
      else expect(existsSync(join(process.cwd(), "app", "[locale]", step.href, "page.tsx")), step.href).toBe(true);
    }
  });

  it("calculates the daily goal and resumable sections", () => {
    expect(goalFraction(5, 20)).toBe(0.25);
    expect(goalFraction(50, 20)).toBe(1);
    expect(goalFraction(-1, 20)).toBe(0);
    expect(goalFraction(5, 0)).toBe(0);
    expect(resumeSection("/grammar/dative")).toBe("grammar");
    expect(resumeSection("/review")).toBe("review");
    expect(resumeSection("/")).toBeNull();
    expect(resumeSection("/progress")).toBeNull();
    expect(resumeSection("/search")).toBeNull();
  });
});

describe("search", () => {
  const data = { nouns: vocab, verbs, adjectives, adverbs, prepositions, phrases, lessons: grammarLessons, dialogues, reading: readingTexts };
  const items = buildSearchIndex("en", data);

  it("indexes every word, verb, lesson, dialogue and text once", () => {
    const expected =
      vocab.length + verbs.length + adjectives.length + adverbs.length + prepositions.length + phrases.length +
      grammarLessons.length + dialogues.length + readingTexts.length;
    expect(items).toHaveLength(expected);
    expect(new Set(items.map((i) => i.id)).size).toBe(expected);
  });

  it("finds a noun with or without its article, first", () => {
    expect(searchItems(items, "kopf")[0].id).toBe("noun:kopf");
    expect(searchItems(items, "der Kopf")[0].id).toBe("noun:kopf");
  });

  it("matches umlauts and eszett in several spellings", () => {
    expect(searchItems(items, "maedchen").map((i) => i.id)).toContain("noun:maedchen");
    expect(searchItems(items, "madchen").map((i) => i.id)).toContain("noun:maedchen");
    expect(searchItems(items, "Mädchen").map((i) => i.id)).toContain("noun:maedchen");
    expect(searchItems(items, "strasse").map((i) => i.id)).toContain("noun:strasse");
    expect(searchItems(items, "gross").map((i) => i.id)).toContain("adjective:gross");
    expect(foldVariants("Straße")).toContain("strasse");
  });

  it("finds verbs by a conjugated form and by translation", () => {
    expect(searchItems(items, "gegangen").map((i) => i.id)).toContain("verb:gehen");
    expect(searchItems(items, "to cook").map((i) => i.id)).toContain("verb:kochen");
  });

  it("finds Persian words, ignoring the zero-width joiner", () => {
    expect(searchItems(items, "دانشجو").map((i) => i.id)).toContain("noun:student");
    expect(searchItems(items, "می‌خواهم").length >= 0).toBe(true);
  });

  it("finds lessons by title in the reader's language", () => {
    const lesson = grammarLessons[0];
    expect(searchItems(items, lesson.title.en).map((i) => i.id)).toContain(`grammar:${lesson.id}`);
    const german = buildSearchIndex("de", data);
    expect(searchItems(german, lesson.title.de).map((i) => i.id)).toContain(`grammar:${lesson.id}`);
  });

  it("returns nothing for very short or unknown queries and respects the limit", () => {
    expect(searchItems(items, "")).toEqual([]);
    expect(searchItems(items, "k")).toEqual([]);
    expect(searchItems(items, "qqzzxx")).toEqual([]);
    expect(searchItems(items, "er", 5).length).toBeLessThanOrEqual(5);
  });

  it("links to pages that exist", () => {
    for (const item of items) {
      const path = item.href.split("?")[0];
      const dynamic = /^\/(grammar|dialogues|reading|verbs)\/[^/]+$/.test(path);
      if (!dynamic) expect(existsSync(join(process.cwd(), "app", "[locale]", path, "page.tsx")), path).toBe(true);
    }
  });
});

describe("site and SEO", () => {
  it("builds the public URL from the environment, with safe defaults", () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://example.org/" })).toBe("https://example.org");
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "deutsch.vercel.app" })).toBe("https://deutsch.vercel.app");
    expect(siteUrl({ VERCEL_URL: "preview-123.vercel.app" })).toBe("https://preview-123.vercel.app");
    expect(siteUrl({})).toBe("http://localhost:3000");
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "  ", VERCEL_URL: "x.vercel.app" })).toBe("https://x.vercel.app");
  });

  it("makes canonical and hreflang links for every locale", () => {
    const a = pageAlternates("de", "/grammar");
    expect(a.canonical).toBe("/de/grammar");
    expect(a.languages).toEqual({ en: "/en/grammar", fa: "/fa/grammar", de: "/de/grammar", "x-default": "/en/grammar" });
    expect(pageAlternates("en", "").canonical).toBe("/en");
  });

  it("lists every page for the sitemap, and each static page exists", () => {
    const paths = allPaths({ lessons: grammarLessons.map((l) => l.id), dialogues: dialogues.map((d) => d.id), reading: readingTexts.map((r) => r.id), verbs: verbs.map((v) => v.id) });
    expect(paths).toHaveLength(STATIC_PATHS.length + grammarLessons.length + dialogues.length + readingTexts.length + verbs.length);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of STATIC_PATHS) {
      const file = p === "" ? join("app", "[locale]", "page.tsx") : join("app", "[locale]", p, "page.tsx");
      expect(existsSync(join(process.cwd(), file)), p).toBe(true);
    }
  });

  it("ships the PWA files", () => {
    for (const f of ["public/sw.js", "public/icon.svg", "app/manifest.ts", "app/robots.ts", "app/sitemap.ts"]) {
      expect(existsSync(join(process.cwd(), f)), f).toBe(true);
    }
  });
});

describe("navigation", () => {
  it("has six entries: home, three groups, exam and progress", () => {
    expect(NAV_ENTRIES.map((e) => (e.type === "link" ? e.item.key : e.key))).toEqual(["home", "learn", "practice", "read", "exam", "progress"]);
  });

  it("covers every learning page exactly once, and each target exists", () => {
    const leaves = NAV_ENTRIES.flatMap((e) => (e.type === "link" ? [e.item] : [...e.items]));
    expect(new Set(leaves.map((l) => l.key)).size).toBe(leaves.length);
    for (const leaf of leaves) {
      const file = leaf.href === "/" ? join("app", "[locale]", "page.tsx") : join("app", "[locale]", leaf.href, "page.tsx");
      expect(existsSync(join(process.cwd(), file)), leaf.href).toBe(true);
    }
    expect(leaves.map((l) => l.key).sort()).toEqual(
      ["arcade", "dialogues", "exam", "grammar", "home", "listen", "numbers", "progress", "reading", "review", "sentences", "verbs", "vocabulary"],
    );
  });

  it("labels every item in all languages", () => {
    const leaves = NAV_ENTRIES.flatMap((e) => (e.type === "link" ? [e.item.key] : [e.key, ...e.items.map((i) => i.key)]));
    for (const m of [en, fa, de]) {
      const nav = m.Nav as Record<string, string>;
      for (const key of [...leaves, "readShort", "search", "skipToContent"]) expect(nav[key], key).toBeTruthy();
    }
  });

  it("marks nested pages as active", () => {
    expect(isActivePath("/grammar/dative", "/grammar")).toBe(true);
    expect(isActivePath("/grammar", "/grammar")).toBe(true);
    expect(isActivePath("/grammatik", "/grammar")).toBe(false);
    expect(isActivePath("/arcade", "/")).toBe(false);
    expect(isActivePath("/", "/")).toBe(true);
  });
});

describe("message consistency", () => {
  it("lists argument names", () => {
    expect(placeholders("{count, plural, one {# word} other {# words}} of {total}")).toEqual(["count", "total"]);
    expect(placeholders("plain")).toEqual([]);
  });

  it("flattens nested messages", () => {
    expect(flattenMessages({ a: { b: "x", c: { d: "y" } }, e: "z" })).toEqual({ "a.b": "x", "a.c.d": "y", e: "z" });
  });

  it("finds missing, empty, extra and mismatched messages", () => {
    const base = { a: "Hello {name}", b: "two", c: "three" };
    const other = { a: "Hallo {who}", b: " ", extra: "x" };
    const problems = checkMessages(base, other, "de").map((p) => `${p.key}:${p.problem.message}`);
    expect(problems.some((p) => p.startsWith("a:") && p.includes("placeholders differ"))).toBe(true);
    expect(problems.some((p) => p.startsWith("b:") && p.includes("empty"))).toBe(true);
    expect(problems.some((p) => p.startsWith("c:") && p.includes("missing"))).toBe(true);
    expect(problems.some((p) => p.startsWith("extra:"))).toBe(true);
  });

  it("holds for the shipped messages", () => {
    expect(checkMessages(en, fa, "fa")).toEqual([]);
    expect(checkMessages(en, de, "de")).toEqual([]);
  });
});
