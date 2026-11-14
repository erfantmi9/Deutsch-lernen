/**
 * Which voice speaks what. Used only by scripts/generate-audio.ts; the app itself plays the generated files.
 *
 * The recordings are made offline with Piper (open source, runs on your own computer, no account or key). Piper has two
 * clean German voices, a woman (kerstin) and a man (thorsten). More people are made from them with `pitch`: the voice
 * is shifted up (younger, smaller) or down (older, bigger) by that factor without changing its speed. `lengthScale`
 * makes someone speak slower (above 1) or faster. The two people of a conversation always differ (checked by a test).
 *
 * (Piper's multi-speaker German model was tried and dropped: measured, its speakers talk 3-5 times slower than normal
 * with second-long pauses inside sentences.)
 */

export type Gender = "FEMALE" | "MALE";

/** Piper models used, with where to download them (huggingface.co/rhasspy/piper-voices). Both CC0. */
export const PIPER_MODELS = {
  "de_DE-thorsten-high": "de/de_DE/thorsten/high",
  "de_DE-kerstin-medium": "de/de_DE/kerstin/medium",
} as const;
export type PiperModel = keyof typeof PIPER_MODELS;

export interface VoiceSpec {
  gender: Gender;
  model: PiperModel;
  /** Pitch and timbre factor, about 0.85 to 1.2: another person from the same voice. */
  pitch?: number;
  /** Speaking speed: 1 normal, above 1 slower. */
  lengthScale?: number;
}

/** Stable name of a voice, part of each recording's file name. */
export const voiceId = (v: VoiceSpec): string => `${v.model}#${v.pitch ?? 1}#${v.lengthScale ?? 1}`;

/** Pitch factors far enough apart to sound like different people. */
const PITCH = { A: 1, B: 1.08, C: 0.93, D: 1.15, E: 0.87 } as const;
type Person = keyof typeof PITCH;

/** Women: kerstin at five pitches. Men: thorsten at five pitches. */
const F = (p: Person, lengthScale?: number): VoiceSpec => ({ gender: "FEMALE", model: "de_DE-kerstin-medium", pitch: PITCH[p], lengthScale });
const M = (p: Person, lengthScale?: number): VoiceSpec => ({ gender: "MALE", model: "de_DE-thorsten-high", pitch: PITCH[p], lengthScale });

/** Every dialogue character keeps one voice in every exercise (dialogues and dictation). Older people speak a bit slower. */
export const CHARACTER_VOICES: Readonly<Record<string, VoiceSpec>> = {
  Lena: F("A"),
  Omid: M("A"),
  Empfang: F("B"),
  "Herr Fischer": M("E", 1.06),
  "Herr Rossi": M("B"),
  Mitarbeiterin: F("C"),
  Laura: F("D"),
  Tim: M("D"),
  Nina: F("B"),
  Paul: M("C"),
  Eva: F("C"),
  Karim: M("B"),
  Ben: M("D"),
  Hanna: F("A"),
  "Frau Weber": F("E", 1.06),
  "Herr Yilmaz": M("A"),
  Kellner: M("B"),
  Mia: F("D"),
  "Herr Braun": M("E", 1.1),
  Verkäuferin: F("C"),
  Sara: F("B"),
  Verkäufer: M("C"),
  Jonas: M("D"),
  Passantin: F("E"),
};

/** Speaker 0 and (in conversations) speaker 1 of each listening message, matching who speaks in the text. */
export const MESSAGE_VOICES: Readonly<Record<string, readonly [VoiceSpec] | readonly [VoiceSpec, VoiceSpec]>> = {
  "gleis-wechsel": [M("A")],
  "zug-verspaetung": [F("A")],
  "supermarkt-aepfel": [F("B")],
  "kaufhaus-schliesst": [M("C")],
  "flughafen-ausgang": [F("C")],
  "kaufhaus-stock": [F("D")],
  "kurs-raum": [M("B")],
  "bus-baustelle": [M("E")],
  "praxis-termin": [F("C")],
  "kino-treffen": [F("B")],
  "mama-einkaufen": [F("E", 1.04)],
  "fahrrad-reparatur": [M("B")],
  "kollegin-krank": [F("D")],
  "vermieter-techniker": [M("E", 1.04)],
  "party-samstag": [M("D")],
  "restaurant-tisch": [M("C")],
  "baeckerei-preis": [M("B"), F("A")],
  "weg-post": [M("A"), F("E")],
  "bus-viertel": [F("D"), M("C")],
  "wochenende-eltern": [F("B"), M("D")],
  "jacke-farbe": [M("C"), F("C")],
  "praxis-anruf": [F("C"), M("A")],
  "wohnung-zimmer": [F("A"), F("D")],
  "geburtstag-mai": [F("B"), M("E")],
  "kurs-beginn": [M("D"), F("E")],
};

/** Word-order sentences have no speaker: they rotate through these. */
export const DICTATION_VOICES: readonly VoiceSpec[] = [F("A"), M("A"), F("C"), M("B"), F("D"), M("C")];

/** Minimal pairs are recorded by a woman and a man; the drill picks one at random, so the ear cannot rely on one voice. */
export const PAIR_VOICES = { f: F("A"), m: M("A") } as const;

/** The same model at nearly the same pitch is the same person (speed alone does not make two people). */
export const sameVoice = (a: VoiceSpec, b: VoiceSpec): boolean => a.model === b.model && Math.abs((a.pitch ?? 1) - (b.pitch ?? 1)) < 0.06;
