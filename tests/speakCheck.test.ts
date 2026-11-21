import { describe, expect, it } from "vitest";
import { applySpeak, checkHeard, checkSpeech, EMPTY_SPEAK_STATS, PASS_SHARE, wordsForDigits } from "@/lib/speakCheck";

const marks = (sentence: string, heard: string) => checkHeard(sentence, heard).words.map((w) => `${w.expected}:${w.mark}`);

describe("speaking: what was understood", () => {
  it("ignores capital letters and punctuation, which speech does not carry", () => {
    const r = checkHeard("Wie heißt du?", "wie heißt du");
    expect(r.ok).toBe(3);
    expect(r.passed).toBe(true);
    expect(r.score).toBe(1);
  });

  it("treats ß and ss as the same sound", () => {
    expect(marks("Ich heiße Omid.", "Ich heisse Omid")).toEqual(["Ich:ok", "heiße:ok", "Omid:ok"]);
  });

  it("marks a word with the wrong vowel or one letter off as close, and keeps what was heard", () => {
    const r = checkHeard("Das ist schön.", "das ist schon");
    expect(r.words[2]).toEqual({ expected: "schön", heard: "schon", mark: "close" });
    expect(r.score).toBeCloseTo(2.5 / 3);
  });

  it("marks words that were not understood as missing, also when something else was heard", () => {
    expect(marks("Ich wohne in Berlin.", "ich wohne")).toEqual(["Ich:ok", "wohne:ok", "in:missing", "Berlin:missing"]);
    const r = checkHeard("Ich trinke Kaffee.", "ich denke Kaffee");
    expect(r.words[1]).toMatchObject({ mark: "missing", heard: "denke" });
  });

  it("does not hold extra words (fillers, saying it twice) against the learner", () => {
    const r = checkHeard("Guten Morgen!", "äh guten Morgen guten Morgen");
    expect(r.passed).toBe(true);
    expect(r.score).toBe(1);
  });

  it(`passes when at least ${PASS_SHARE * 100}% of the words were understood`, () => {
    // 7 words, one not understood: 6/7 ≈ 0.857.
    expect(checkHeard("Am Samstag gehe ich mit Anna einkaufen.", "am Samstag gehe ich mit Hannah einkaufen").passed).toBe(true);
    // 4 words, one not understood: 0.75.
    expect(checkHeard("Ich komme aus Iran.", "ich komme aus").passed).toBe(false);
  });

  it("writes recognised digits as words", () => {
    expect(wordsForDigits("Ich habe 2 Kinder.")).toBe("Ich habe zwei Kinder.");
    expect(wordsForDigits("Er ist 21 Jahre alt")).toBe("Er ist einundzwanzig Jahre alt");
    expect(wordsForDigits("Ich habe 1 Bruder")).toBe("Ich habe ein Bruder");
    expect(wordsForDigits("um 7:30 Uhr")).toBe("um 7:30 Uhr");
    expect(checkHeard("Ich habe zwei Kinder.", "ich habe 2 Kinder").passed).toBe(true);
  });

  it("takes the recogniser's guess closest to the sentence", () => {
    const r = checkSpeech("Wo ist der Bahnhof?", ["wo ist der Bahnhof", "wo ist der Bahnhof?", "Pro ist der Bauhof"]);
    expect(r?.score).toBe(1);
    expect(checkSpeech("Wo ist der Bahnhof?", ["Pro ist der Bauhof", "wo ist der Bahnhof"])?.heard).toBe("wo ist der Bahnhof");
  });

  it("returns null when nothing was heard", () => {
    expect(checkSpeech("Hallo!", [])).toBeNull();
    expect(checkSpeech("Hallo!", ["", "  "])).toBeNull();
  });
});

describe("speaking: progress", () => {
  it("remembers each passed sentence once, and nothing for a miss", () => {
    const a = applySpeak(EMPTY_SPEAK_STATS, "s:x", true);
    expect(a.speakPassed).toEqual(["s:x"]);
    expect(applySpeak(a, "s:x", true)).toBe(a);
    expect(applySpeak(a, "s:y", false)).toBe(a);
  });
});
