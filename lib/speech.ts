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

/** Best German voice: de-DE before other German variants, on-device voices before online ones. */
export function pickGermanVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const german = voices.filter(isGerman);
  if (german.length === 0) return null;
  const score = (v: T): number =>
    (v.lang.toLowerCase().replace("_", "-") === "de-de" ? 2 : 0) + (v.localService ? 1 : 0);
  return [...german].sort((a, b) => score(b) - score(a))[0];
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

/* Which utterance is playing, as "<text>|<rate>", so every Play button for that text can show Stop. */
let current: { key: string; utterance: SpeechSynthesisUtterance } | null = null;
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
  current = { key: speechKey(text, rate), utterance };
  emit();
  synth.speak(utterance);
  return true;
}
