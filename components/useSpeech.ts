"use client";

import { useEffect, useState } from "react";
import { isSpeechSupported, pickGermanVoice } from "@/lib/speech";

export interface SpeechSupport {
  /** Known only after mount; false on the server, so server and first client render agree. */
  supported: boolean;
  /** A German voice is installed (speech still works without one, but may sound wrong). */
  germanVoice: boolean;
  /**
   * The voice list has loaded (voices arrive asynchronously in Chrome via `voiceschanged`), or we gave up waiting.
   * Only then is `germanVoice === false` meaningful: before that, no tip should be shown and nothing hidden.
   */
  voicesReady: boolean;
}

/** How long to wait for `voiceschanged` before treating an empty voice list as final. */
export const VOICES_TIMEOUT_MS = 1500;

export function useSpeechSupport(): SpeechSupport {
  const [state, setState] = useState<SpeechSupport>({ supported: false, germanVoice: false, voicesReady: false });

  useEffect(() => {
    if (!isSpeechSupported()) {
      setState({ supported: false, germanVoice: false, voicesReady: true });
      return;
    }
    const synth = window.speechSynthesis;
    const update = (final: boolean) => {
      const voices = synth.getVoices();
      setState({ supported: true, germanVoice: pickGermanVoice(voices) !== null, voicesReady: final || voices.length > 0 });
    };
    const onChange = () => update(true);
    update(false);
    synth.addEventListener("voiceschanged", onChange);
    // Some browsers never fire voiceschanged when there are no voices at all.
    const timer = window.setTimeout(() => update(true), VOICES_TIMEOUT_MS);
    return () => {
      synth.removeEventListener("voiceschanged", onChange);
      window.clearTimeout(timer);
    };
  }, []);

  return state;
}
