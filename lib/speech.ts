/**
 * Text to speech with the browser's Web Speech API. No audio files, no network.
 * Everything touching `window` is guarded, so importing this on the server is safe.
 */

export interface VoiceLike {
  lang: string;
  name: string;
  localService?: boolean;
}

export const GERMAN_LANG = "de-DE";

/** Normal and slow speaking rate. */
export const RATE = { normal: 0.9, slow: 0.65 } as const;

const isGerman = (v: VoiceLike): boolean => v.lang.toLowerCase().replace("_", "-").startsWith("de");

/** German voices, best first: de-DE before other German variants, on-device voices before online ones. */
export function germanVoices<T extends VoiceLike>(voices: readonly T[]): T[] {
  const score = (v: T): number =>
    (v.lang.toLowerCase().replace("_", "-") === "de-de" ? 2 : 0) + (v.localService ? 1 : 0);
  return voices.filter(isGerman).sort((a, b) => score(b) - score(a));
}

/** Best German voice (see germanVoices). */
export function pickGermanVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  return germanVoices(voices)[0] ?? null;
}

/** Pitch of the second speaker when the device has only one German voice, so two people still sound different. */
export const SECOND_SPEAKER_PITCH = 0.75;

/**
 * Voice and pitch for speaker 0 or 1 of a conversation: the second speaker gets the second German voice, or, with
 * only one voice installed, the same voice at a lower pitch.
 */
export function speakerVoice<T extends VoiceLike>(voices: readonly T[], speaker: 0 | 1): { voice: T | null; pitch: number } {
  const german = germanVoices(voices);
  if (speaker === 0 || german.length === 0) return { voice: german[0] ?? null, pitch: 1 };
  return german.length > 1 ? { voice: german[1], pitch: 1 } : { voice: german[0], pitch: SECOND_SPEAKER_PITCH };
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/*
 * Which utterance is playing, as "<text>|<rate>", so every Play button for that text can show Stop. For a sequence
 * `utterance` is its last part and `part` the index of the part being spoken.
 */
let current: { key: string; utterance: SpeechSynthesisUtterance; part: number } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const speechKey = (text: string, rate: number): string => `${text}|${rate}`;

export function subscribeSpeech(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpeakingKey(): string | null {
  return current?.key ?? null;
}

/** Index of the part of a sequence (see speakSequence) being spoken, or null. */
export function getSpeakingPart(): number | null {
  return current?.part ?? null;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  if (current) {
    current = null;
    emit();
  }
}

/**
 * Speaks German text. Returns false when the browser cannot speak. A new call replaces the current one.
 * Call it only from a user gesture (a click / key handler), never from an effect or timer: browsers block or
 * surprise users with audio that starts on its own.
 */
export function speak(text: string, rate: number = RATE.normal, onEnd?: () => void): boolean {
  if (!isSpeechSupported() || text.trim() === "") return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = GERMAN_LANG;
  utterance.rate = rate;
  const voice = pickGermanVoice(synth.getVoices());
  if (voice) utterance.voice = voice;
  const done = () => {
    // A cancelled utterance ends asynchronously, possibly after its replacement started: only clear our own entry.
    if (current?.utterance === utterance) {
      current = null;
      emit();
    }
    onEnd?.();
  };
  utterance.onend = done;
  utterance.onerror = done;
  current = { key: speechKey(text, rate), utterance, part: 0 };
  emit();
  synth.speak(utterance);
  return true;
}

export interface SpokenPart {
  text: string;
  /** Speaker 0 or 1 of a conversation; they get different voices (see speakerVoice). */
  speaker?: 0 | 1;
}

/**
 * Speaks several parts one after another: a dialogue, or an announcement. All parts are queued in the browser's own
 * speech queue at once (no timers), so it also works where speech started outside a user gesture is blocked (iOS).
 * `key` names the sequence: getSpeakingKey() returns speechKey(key, rate) while it plays, and getSpeakingPart() the
 * index of the part being spoken. A new speak() / speakSequence() / stopSpeaking() ends it. Call it from a user gesture.
 */
export function speakSequence(key: string, parts: readonly SpokenPart[], rate: number = RATE.normal): boolean {
  const spoken = parts.filter((p) => p.text.trim() !== "");
  if (!isSpeechSupported() || spoken.length === 0) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const voices = synth.getVoices();
  const utterances = spoken.map((p) => {
    const u = new SpeechSynthesisUtterance(p.text);
    u.lang = GERMAN_LANG;
    u.rate = rate;
    const { voice, pitch } = speakerVoice(voices, p.speaker ?? 0);
    if (voice) u.voice = voice;
    u.pitch = pitch;
    return u;
  });
  const last = utterances[utterances.length - 1];
  const entry = { key: speechKey(key, rate), utterance: last, part: 0 };
  const done = () => {
    if (current === entry) {
      current = null;
      emit();
    }
  };
  utterances.forEach((u, i) => {
    u.onstart = () => {
      if (current === entry && entry.part !== i) {
        entry.part = i;
        emit();
      }
    };
    // An error in any part (e.g. "interrupted") ends the whole sequence; the last part ending normally ends it too.
    u.onerror = done;
  });
  last.onend = done;
  current = entry;
  emit();
  for (const u of utterances) synth.speak(u);
  return true;
}
