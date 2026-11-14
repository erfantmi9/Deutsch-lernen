import { describe, expect, it } from "vitest";
import { dialogues } from "@/lib/dialogues";
import { dictationPool, listeningMessages, minimalPairs } from "@/lib/listening";
import { speakersOf } from "@/lib/rolePlay";
import { clipJobs, clipKey, missingVoices, voiceClashes } from "@/lib/audio/clips";
import { CHARACTER_VOICES, PIPER_MODELS, sameVoice, voiceId } from "@/lib/audio/voices";
import { babblePool, dialogueAudio } from "@/lib/audio/listeningAudio";
import { clipSrc } from "@/lib/audio/manifest";
import { messageFx } from "@/lib/audio/fx";
import { DIFFICULTY_MIX, planTimeline, SCENE_MIX } from "@/lib/audioScene";
import { SCENES } from "@/types/listening";

const jobs = clipJobs({ dialogues, messages: listeningMessages, dictation: dictationPool(), pairs: minimalPairs });

describe("recordings: what is recorded by whom", () => {
  it("every dialogue character and every message speaker has a voice", () => {
    expect(missingVoices(dialogues, listeningMessages)).toEqual([]);
  });

  it("records every dialogue line, message line, dictation sentence and both words of every pair in two voices", () => {
    const keys = new Set(jobs.map((j) => j.key));
    expect(keys.size).toBe(jobs.length);
    for (const d of dialogues) d.lines.forEach((_, i) => expect(keys.has(clipKey.dialogueLine(d.id, i))).toBe(true));
    for (const m of listeningMessages) m.lines.forEach((_, i) => expect(keys.has(clipKey.messageLine(m.id, i))).toBe(true));
    for (const s of dictationPool()) expect(keys.has(clipKey.dictation(s.id))).toBe(true);
    for (const p of minimalPairs) for (const side of ["a", "b"] as const) for (const v of ["f", "m"] as const) expect(keys.has(clipKey.pairWord(p.id, side, v))).toBe(true);
  });

  it("the two people of every conversation have different voices", () => {
    expect(voiceClashes(dialogues, listeningMessages)).toEqual([]);
  });

  it("uses only known models, with pitches in the natural range", () => {
    for (const j of jobs) {
      expect(PIPER_MODELS[j.voice.model], voiceId(j.voice)).toBeDefined();
      expect(j.voice.pitch ?? 1).toBeGreaterThanOrEqual(0.85);
      expect(j.voice.pitch ?? 1).toBeLessThanOrEqual(1.2);
    }
    const women = CHARACTER_VOICES.Lena;
    expect(sameVoice(women, { ...women, lengthScale: 1.2 })).toBe(true);
    expect(sameVoice(women, { ...women, pitch: 1.08 })).toBe(false);
    expect(new Set(Object.values(CHARACTER_VOICES).map(voiceId)).size).toBeGreaterThanOrEqual(10);
  });

  it("a dictation sentence from a dialogue is spoken by that character, so it reuses the same recording", () => {
    const line = jobs.find((j) => j.key === clipKey.dialogueLine("kennenlernen", 0))!;
    const dict = jobs.find((j) => j.key === clipKey.dictation("d:kennenlernen:0"))!;
    expect(dict.voice).toEqual(line.voice);
    expect(dict.text).toBe(line.text);
  });
});

describe("recordings: in the app", () => {
  it("without a recording the exercise gets null and uses the browser voice", () => {
    expect(clipSrc("dialogue:does-not-exist:0")).toBeNull();
  });

  it("the background murmur never contains the text being listened to", () => {
    const fake = dialogues.flatMap((d) => d.lines.map((_, i) => `/audio/${d.id}-${i}.mp3`));
    const own = fake.slice(0, 5);
    // babblePool reads the manifest; with no recordings it is empty, with some it excludes the given ones.
    const pool = babblePool(dialogues, own);
    for (const s of own) expect(pool).not.toContain(s);
    expect(dialogueAudio(dialogues[0])).toHaveLength(dialogues[0].lines.length);
  });

  it("announcements come through a loudspeaker, phone messages and the far end of a call through a phone", () => {
    const by = (id: string) => listeningMessages.find((m) => m.id === id)!;
    expect(messageFx(by("gleis-wechsel"), 0)).toBe("pa");
    expect(messageFx(by("kurs-raum"), 0)).toBe("dry");
    expect(messageFx(by("kino-treffen"), 0)).toBe("phone");
    expect(messageFx(by("praxis-anruf"), 0)).toBe("phone");
    expect(messageFx(by("praxis-anruf"), 1)).toBe("dry");
    expect(dialogues.find((d) => d.id === "am-telefon")?.phoneSpeaker).toBe("Laura");
  });
});

describe("audio scenes", () => {
  it("has a mix for every scene, and harder levels are louder", () => {
    for (const s of SCENES) expect(SCENE_MIX[s]).toBeDefined();
    expect(DIFFICULTY_MIX.easy.level).toBeLessThan(DIFFICULTY_MIX.real.level);
    expect(DIFFICULTY_MIX.real.level).toBeLessThan(DIFFICULTY_MIX.hard.level);
    expect(DIFFICULTY_MIX.hard.gapScale).toBeLessThan(DIFFICULTY_MIX.easy.gapScale);
  });

  it("plans parts one after another with longer pauses when the other person answers", () => {
    const plan = planTimeline([2, 1, 1], [0, 0, 1], { rate: 1, gapScale: 1, leadIn: 1, tail: 1 });
    expect(plan.starts[0]).toBe(1);
    expect(plan.starts[1]).toBeCloseTo(3.3);
    expect(plan.starts[2]).toBeCloseTo(4.85);
    expect(plan.end).toBeCloseTo(6.85);
    const slow = planTimeline([2, 1], [0, 1], { rate: 0.5, gapScale: 2, leadIn: 0, tail: 0 });
    expect(slow.starts[1]).toBeCloseTo(5.1);
  });
});
