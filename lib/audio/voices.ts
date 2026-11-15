/**
 * Which voice speaks what. Used only by scripts/generate-audio.ts; the app itself plays the generated files.
 *
 * The recordings are made with edge-tts (the neural "Read aloud" voices of Microsoft Edge): free, no account, no key.
 * Only the voices in EDGE_VOICES are used; a name the service does not know silently comes back as its default voice,
 * so new names must be checked by ear. Each person is one real voice; `pitch` (Hz) and `rate` (percent, below 0 slower)
 * are applied by the service itself, so they stay natural. The two people of a conversation always differ (checked by a
 * test).
 */

export type Gender = "FEMALE" | "MALE";

/** The neural voices used: German, plus Austrian (standard German with a light accent). No Swiss voices. */
export const EDGE_VOICES = {
  "de-DE-TanjaNeural": "FEMALE",
  "de-AT-IngridNeural": "FEMALE",
  "de-DE-ChristophNeural": "MALE",
  "de-AT-JonasNeural": "MALE",
} as const satisfies Record<string, Gender>;
export type EdgeVoice = keyof typeof EDGE_VOICES;

export interface VoiceSpec {
  gender: Gender;
  name: EdgeVoice;
  /** Pitch shift in Hz, about -12 to +12: another person from the same voice. */
  pitch?: number;
  /** Speed change in percent: 0 normal, -10 a bit slower. */
  rate?: number;
}

/** Stable name of a voice, part of each recording's file name. */
export const voiceId = (v: VoiceSpec): string => `${v.name}#${v.pitch ?? 0}#${v.rate ?? 0}`;

/** Five people per gender from two real voices, each also a bit lower or higher. */
const WOMEN: Record<Person, Pick<VoiceSpec, "name" | "pitch">> = {
  A: { name: "de-DE-TanjaNeural" },
  B: { name: "de-AT-IngridNeural" },
  C: { name: "de-DE-TanjaNeural", pitch: -10 },
  D: { name: "de-DE-TanjaNeural", pitch: 8 },
  E: { name: "de-AT-IngridNeural", pitch: -10 },
};
const MEN: Record<Person, Pick<VoiceSpec, "name" | "pitch">> = {
  A: { name: "de-DE-ChristophNeural" },
  B: { name: "de-AT-JonasNeural" },
  C: { name: "de-DE-ChristophNeural", pitch: -8 },
  D: { name: "de-DE-ChristophNeural", pitch: 8 },
  E: { name: "de-AT-JonasNeural", pitch: -10 },
};
type Person = "A" | "B" | "C" | "D" | "E";

const F = (p: Person, rate?: number): VoiceSpec => ({ gender: "FEMALE", ...WOMEN[p], rate });
const M = (p: Person, rate?: number): VoiceSpec => ({ gender: "MALE", ...MEN[p], rate });

/** Every dialogue character keeps one voice in every exercise (dialogues and dictation). Older people speak a bit slower. */
export const CHARACTER_VOICES: Readonly<Record<string, VoiceSpec>> = {
  Lena: F("A"),
  Omid: M("A"),
  Empfang: F("B"),
  "Herr Fischer": M("E", -6),
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
  "Frau Weber": F("E", -6),
  "Herr Yilmaz": M("A"),
  Kellner: M("B"),
  Mia: F("D"),
  "Herr Braun": M("E", -10),
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
  "mama-einkaufen": [F("E", -4)],
  "fahrrad-reparatur": [M("B")],
  "kollegin-krank": [F("D")],
  "vermieter-techniker": [M("E", -4)],
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

/** The same voice at nearly the same pitch is the same person (speed alone does not make two people). */
export const sameVoice = (a: VoiceSpec, b: VoiceSpec): boolean => a.name === b.name && Math.abs((a.pitch ?? 0) - (b.pitch ?? 0)) < 6;
