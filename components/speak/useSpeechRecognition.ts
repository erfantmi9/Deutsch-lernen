"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GERMAN_LANG } from "@/lib/speech";

/*
 * The Web Speech API's recognition half. Not in TypeScript's DOM types (it is not a standard yet), so the little we use
 * is typed here. Chrome (also on Android) and Edge send the audio to their speech service; Safari has it partly;
 * Firefox not at all.
 */
interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  readonly results: { readonly length: number; [index: number]: RecognitionResult };
}
interface RecognitionErrorEvent {
  readonly error: string;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

export function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** blocked: microphone permission refused. noMic: no microphone. network: the speech service could not be reached. */
export type RecognitionProblem = "blocked" | "noMic" | "network" | "other";

const PROBLEM: Record<string, RecognitionProblem> = {
  "not-allowed": "blocked",
  "service-not-allowed": "blocked",
  "audio-capture": "noMic",
  network: "network",
};

/** How many guesses to ask for; checkSpeech() takes the one closest to the sentence. */
const ALTERNATIVES = 5;

/**
 * Joins the results of one utterance into whole-sentence guesses: guess k is every result's k-th alternative (or its
 * first, where a result has fewer).
 */
function guesses(results: RecognitionEvent["results"]): string[] {
  const out: string[] = [];
  for (let k = 0; k < ALTERNATIVES; k++) {
    const parts: string[] = [];
    let any = false;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (k < r.length) any = true;
      parts.push((r[Math.min(k, r.length - 1)]?.transcript ?? "").trim());
    }
    if (k > 0 && !any) break;
    const text = parts.filter(Boolean).join(" ");
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

export interface SpeechRecognitionApi {
  /** null until mounted (server and first client render agree). */
  supported: boolean | null;
  listening: boolean;
  /** What has been heard so far while listening. */
  interim: string;
  /** Listens for one sentence; `onDone` gets the guesses (empty when nothing was heard) unless a problem occurs. */
  start: (onDone: (alternatives: string[]) => void, onProblem: (p: RecognitionProblem) => void) => void;
  /** Stops listening and checks what was heard so far. */
  stop: () => void;
}

export function useSpeechRecognition(): SpeechRecognitionApi {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(recognitionCtor() !== null);
    return () => {
      const r = rec.current;
      rec.current = null;
      if (r) {
        r.onend = r.onerror = r.onresult = null;
        r.abort();
      }
    };
  }, []);

  const start = useCallback<SpeechRecognitionApi["start"]>((onDone, onProblem) => {
    const Ctor = recognitionCtor();
    if (!Ctor || rec.current) return;
    const r = new Ctor();
    r.lang = GERMAN_LANG;
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = ALTERNATIVES;
    let final: string[] = [];
    let problem: RecognitionProblem | null = null;
    r.onresult = (e) => {
      let text = "";
      let allFinal = true;
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0]?.transcript ?? "";
        if (!e.results[i].isFinal) allFinal = false;
      }
      setInterim(text.trim());
      if (allFinal) final = guesses(e.results);
    };
    r.onerror = (e) => {
      // "no-speech" and "aborted" are not problems: nothing was said, or we stopped it ourselves.
      if (e.error === "no-speech" || e.error === "aborted") return;
      problem = PROBLEM[e.error] ?? "other";
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      setListening(false);
      setInterim("");
      if (problem) onProblem(problem);
      else onDone(final);
    };
    rec.current = r;
    setInterim("");
    setListening(true);
    try {
      r.start();
    } catch {
      rec.current = null;
      setListening(false);
      onProblem("other");
    }
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported, listening, interim, start, stop };
}
