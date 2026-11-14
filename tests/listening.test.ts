import { describe, expect, it } from "vitest";
import {
  checkDictation,
  compareWord,
  DICTATION_LEVELS,
  DICTATION_ROUND,
  dictationWords,
  isDictatable,
  levelOf,
  pickRound,
  sentenceParts,
  PART_WORDS,
} from "@/lib/dictation";
import type { DictationSentence } from "@/lib/dictation";
import { dictationPool, listeningMessages, minimalPairs } from "@/lib/listening";
import { applyDictation, applyMessage, applySound, EMPTY_LISTEN_STATS, soundAccuracy } from "@/lib/listenStats";
import { germanVoices, SECOND_SPEAKER_PITCH, speakerVoice } from "@/lib/speech";
import { SOUND_CONTRASTS } from "@/types/listening";

const marks = (sentence: string, typed: string) =>
  checkDictation(sentence, typed).ops.map((o) => (o.type === "extra" ? `+${o.typed}` : `${o.expected}:${o.mark}`));

describe("dictation: words and levels", () => {
  it("drops punctuation but keeps the words", () => {
    expect(dictationWords("Hallo! Wie heißt du?")).toEqual(["Hallo", "Wie", "heißt", "du"]);
    expect(dictationWords("  „Ja“,   sagt sie –  gut. ")).toEqual(["Ja", "sagt", "sie", "gut"]);
  });

  it("puts sentences into levels by word count", () => {
    expect(levelOf("Ich heiße Omid.")).toBe("short");
    expect(levelOf("Ich wohne seit zwei Jahren in Berlin.")).toBe("medium");
    expect(levelOf("Ich komme aus Österreich, aber ich wohne jetzt in Berlin.")).toBe("long");
    expect(levelOf("Hallo!")).toBeNull();
  });

  it("leaves out digits, abbreviations and filler words", () => {
    expect(isDictatable("Der Zug fährt um 8 Uhr.")).toBe(false);
    expect(isDictatable("Der ICE fährt um acht Uhr.")).toBe(false);
    expect(isDictatable("Hmm, die ist ein bisschen teuer.")).toBe(false);
    expect(isDictatable("Der Zug fährt um acht Uhr.")).toBe(true);
  });

  it("splits long sentences into short parts, breaking at commas", () => {
    const parts = sentenceParts("Ich komme aus Österreich, aber ich wohne in Berlin.");
    expect(parts.join(" ")).toBe("Ich komme aus Österreich, aber ich wohne in Berlin.");
    expect(parts[0]).toBe("Ich komme aus Österreich,");
    for (const p of parts) expect(p.split(" ").length).toBeLessThanOrEqual(PART_WORDS + 1);
    // A one-word tail joins the part before it.
    expect(sentenceParts("Ich gehe heute nach Hause.")).toEqual(["Ich gehe heute nach Hause."]);
    expect(sentenceParts("Ja.")).toEqual(["Ja."]);
  });
});

describe("dictation: checking", () => {
  it("tells small slips from wrong words", () => {
    expect(compareWord("Haus", "Haus")).toBe("ok");
    expect(compareWord("Haus", "haus")).toBe("case");
    expect(compareWord("schön", "schoen")).toBe("umlaut");
    expect(compareWord("schön", "schon")).toBe("umlaut");
    expect(compareWord("heißt", "heisst")).toBe("umlaut");
    expect(compareWord("Brötchen", "Brotchen")).toBe("umlaut");
    expect(compareWord("Kaffee", "Kafee")).toBe("typo");
    expect(compareWord("ist", "isst")).toBe("wrong"); // short words: one letter is another word
    expect(compareWord("Hund", "Katze")).toBe("wrong");
  });

  it("a perfect sentence passes with full score; punctuation does not matter", () => {
    const r = checkDictation("Wie heißt du?", "wie heißt du");
    expect(r.passed).toBe(true);
    expect(r.correct).toBe(2);
    expect(r.minor).toBe(1);
    const p = checkDictation("Wie heißt du?", "Wie heißt du");
    expect(p.score).toBe(1);
    expect(p.errors).toBe(0);
  });

  it("a forgotten word only marks that word, not everything after it", () => {
    expect(marks("Ich gehe heute nach Hause.", "Ich gehe nach Hause")).toEqual([
      "Ich:ok",
      "gehe:ok",
      "heute:missing",
      "nach:ok",
      "Hause:ok",
    ]);
  });

  it("marks extra and wrong words", () => {
    expect(marks("Ich trinke Kaffee.", "Ich trinke gern Kaffee")).toEqual(["Ich:ok", "trinke:ok", "+gern", "Kaffee:ok"]);
    expect(marks("Ich trinke Kaffee.", "Ich trinke Tee")).toEqual(["Ich:ok", "trinke:ok", "Kaffee:wrong"]);
    const r = checkDictation("Ich trinke Kaffee.", "Ich trinke gern Kaffee");
    expect(r.passed).toBe(false);
    expect(r.score).toBeCloseTo(2 / 3);
  });

  it("scores an empty answer as zero with every word missing", () => {
    const r = checkDictation("Ich trinke Kaffee.", "");
    expect(r.score).toBe(0);
    expect(r.ops.every((o) => o.type === "word" && o.mark === "missing")).toBe(true);
  });
});

describe("dictation: pool and rounds", () => {
  const pool = dictationPool();

  it("has enough sentences on every level, each dictatable and unique", () => {
    for (const l of DICTATION_LEVELS) expect(pool.filter((s) => levelOf(s.de) === l).length).toBeGreaterThanOrEqual(DICTATION_ROUND * 2);
    expect(pool.every((s) => isDictatable(s.de))).toBe(true);
    expect(new Set(pool.map((s) => s.id)).size).toBe(pool.length);
    expect(new Set(pool.map((s) => s.de.toLowerCase())).size).toBe(pool.length);
  });

  it("asks sentences not yet passed first and avoids the last round", () => {
    const mk = (id: string): DictationSentence => ({ id, de: "Ich trinke gern Kaffee.", translation: { en: "x", fa: "x" } });
    const small = ["a", "b", "c", "d", "e", "f", "g"].map(mk);
    let seed = 0.37;
    const rng = () => (seed = (seed * 9301 + 49297) % 233280 / 233280);
    const round = pickRound(small, "short", new Set(["a", "b"]), rng, 5, new Set(["c"]));
    expect(round).toHaveLength(5);
    expect(round.map((s) => s.id)).not.toContain("a");
    expect(round.map((s) => s.id)).not.toContain("b");
    expect(round[4].id).toBe("c");
  });
});

describe("listening data", () => {
  it("has messages of every kind with an answer among three options", () => {
    for (const kind of ["announcement", "phone", "conversation"]) {
      expect(listeningMessages.filter((m) => m.kind === kind).length).toBeGreaterThanOrEqual(5);
    }
    for (const m of listeningMessages) {
      expect(m.options).toContain(m.answer);
      expect(m.lines.some((l) => l.de.includes(m.evidence))).toBe(true);
      for (const l of m.lines) expect(l.de).not.toMatch(/[0-9]/);
    }
    expect(new Set(listeningMessages.map((m) => m.id)).size).toBe(listeningMessages.length);
  });

  it("has at least three minimal pairs per sound contrast", () => {
    for (const c of SOUND_CONTRASTS) expect(minimalPairs.filter((p) => p.contrast === c).length).toBeGreaterThanOrEqual(3);
    expect(new Set(minimalPairs.map((p) => p.id)).size).toBe(minimalPairs.length);
  });
});

describe("listening progress", () => {
  it("records passed sentences and solved messages once", () => {
    let s = applyDictation(EMPTY_LISTEN_STATS, "s:1", true);
    s = applyDictation(s, "s:1", true);
    s = applyDictation(s, "s:2", false);
    expect(s.dictationPassed).toEqual(["s:1"]);
    s = applyMessage(s, "m1", false);
    s = applyMessage(s, "m1", true);
    expect(s.messagesSolved).toEqual(["m1"]);
  });

  it("counts answers per sound and reports accuracy only after a few answers", () => {
    let s = EMPTY_LISTEN_STATS;
    for (const ok of [true, false, true]) s = applySound(s, "ue-u", ok);
    expect(s.sounds["ue-u"]).toEqual({ right: 2, total: 3 });
    expect(soundAccuracy(s.sounds["ue-u"])).toBeNull();
    s = applySound(s, "ue-u", true);
    expect(soundAccuracy(s.sounds["ue-u"])).toBe(0.75);
    expect(EMPTY_LISTEN_STATS.sounds).toEqual({});
  });
});

describe("speech: two voices for a conversation", () => {
  const anna = { lang: "de-DE", name: "Anna", localService: true };
  const markus = { lang: "de_AT", name: "Markus" };
  const english = { lang: "en-US", name: "Sam" };

  it("orders German voices best first", () => {
    expect(germanVoices([english, markus, anna])).toEqual([anna, markus]);
  });

  it("gives the second speaker the second voice, or a lower pitch when there is only one", () => {
    expect(speakerVoice([anna, markus], 0)).toEqual({ voice: anna, pitch: 1 });
    expect(speakerVoice([anna, markus], 1)).toEqual({ voice: markus, pitch: 1 });
    expect(speakerVoice([english, anna], 1)).toEqual({ voice: anna, pitch: SECOND_SPEAKER_PITCH });
    expect(speakerVoice([english], 1)).toEqual({ voice: null, pitch: 1 });
  });
});
