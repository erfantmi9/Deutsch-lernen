"use client";

import { useEffect, useState } from "react";
import { isSpeechSupported, pickGermanVoice } from "@/lib/speech";

export interface SpeechSupport {
  /** Known only after mount; false on the server, so server and first client render agree. */
  supported: boolean;
  /** A German voice is installed (speech still works without one, but may sound wrong). */
  germanVoice: boolean;
}

export function useSpeechSupport(): SpeechSupport {
  const [state, setState] = useState<SpeechSupport>({ supported: false, germanVoice: false });

  useEffect(() => {
    if (!isSpeechSupported()) return;
    const synth = window.speechSynthesis;
    const update = () => setState({ supported: true, germanVoice: pickGermanVoice(synth.getVoices()) !== null });
    update();
    synth.addEventListener("voiceschanged", update);
    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  return state;
}
