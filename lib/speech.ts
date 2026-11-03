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

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/** Speaks German text. Returns false when the browser cannot speak. A new call replaces the current one. */
export function speak(text: string, rate: number = RATE.normal, onEnd?: () => void): boolean {
  if (!isSpeechSupported() || text.trim() === "") return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = GERMAN_LANG;
  utterance.rate = rate;
  const voice = pickGermanVoice(synth.getVoices());
  if (voice) utterance.voice = voice;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  synth.speak(utterance);
  return true;
}
