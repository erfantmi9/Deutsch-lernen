"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RATE, speak, stopSpeaking } from "@/lib/speech";
import { useSpeechSupport } from "./useSpeech";

/** Reads German text aloud. Renders nothing when the browser has no speech support. */
export default function SpeakButton({
  text,
  slow = false,
  compact = false,
  className = "",
}: {
  text: string;
  slow?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("Speech");
  const { supported } = useSpeechSupport();
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => stopSpeaking(), []);

  if (!supported) return null;

  const label = slow ? t("listenSlow", { text }) : t("listen", { text });
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={speaking}
      onClick={() => {
        setSpeaking(true);
        speak(text, slow ? RATE.slow : RATE.normal, () => setSpeaking(false));
      }}
      className={
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text-muted transition hover:bg-surface-2 hover:text-text focus-visible:ring-4 focus-visible:ring-primary/30 aria-pressed:border-primary aria-pressed:text-primary " +
        (compact ? "size-11 " : "min-h-11 gap-2 px-4 text-sm font-bold ") +
        className
      }
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {slow ? (
          <path d="M5 15c0-5 3-8 8-8 4 0 6 3 6 6v2H5zM8 17v2M16 17v2M5 15 3 14" />
        ) : (
          <>
            <path d="M4 10v4h4l5 4V6L8 10z" />
            <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
          </>
        )}
      </svg>
    </button>
  );
}
