"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useSpeechSupport } from "../useSpeech";

/**
 * Listening exercises only make sense with a German voice. Until the (asynchronous) voice list is known nothing is
 * shown; then either the exercise or a tip on how to get a German voice. Exercises whose texts are all recorded
 * (`recorded`) need no voice and are always shown.
 */
export default function SpeechGate({ children, recorded = false }: { children: ReactNode; recorded?: boolean }) {
  const t = useTranslations("Listen");
  const { supported, germanVoice, voicesReady } = useSpeechSupport();
  if (recorded) return <>{children}</>;
  return (
    <>
      {voicesReady && !supported && <p className="feedback-hint">{t("unsupported")}</p>}
      {voicesReady && supported && !germanVoice && <p className="feedback-hint">{t("needVoice")}</p>}
      {supported && germanVoice && children}
    </>
  );
}
