"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { getSpeakingKey, RATE, speak, speechKey, stopSpeaking, subscribeSpeech } from "@/lib/speech";
import { useSpeechSupport } from "./useSpeech";

/**
 * Reads German text aloud; while speaking it turns into a Stop button (label changes to "Stop", data-speaking set).
 * Its footprint is rendered from the first (server) paint so rows never shift: until speech support is detected, and
 * when there is none, the button is invisible (visibility:hidden, so also out of the a11y tree and tab order) and disabled. Speech is cancelled on unmount (which covers route changes).
 * The speaking state is deliberately NOT a live region: screen readers would talk over the voice.
 */
export default function SpeakButton({
  text,
  slow = false,
  compact = false,
  plain = false,
  hideText = false,
  className = "",
}: {
  text: string;
  slow?: boolean;
  compact?: boolean;
  /** Icon only, no border or fill (inside list rows). Implies compact. */
  plain?: boolean;
  /** The label and tooltip leave the text out ("Listen" instead of "Listen: der Kopf"): for listening exercises, where the text is the answer. */
  hideText?: boolean;
  className?: string;
}) {
  const t = useTranslations("Speech");
  const { supported } = useSpeechSupport();
  const rate = slow ? RATE.slow : RATE.normal;
  const speaking = useSyncExternalStore(subscribeSpeech, getSpeakingKey, () => null) === speechKey(text, rate);

  useEffect(() => () => stopSpeaking(), []);

  const label = speaking
    ? t("stop")
    : hideText
      ? slow
        ? t("playSlow")
        : t("play")
      : slow
        ? t("listenSlow", { text })
        : t("listen", { text });
  return (
    <button
      type="button"
      disabled={!supported}
      aria-hidden={!supported || undefined}
      data-speech-ready={supported ? "" : undefined}
      aria-label={label}
      title={label}
      data-speak-button={slow ? "slow" : "normal"}
      data-speaking={speaking ? "" : undefined}
      onClick={() => {
        if (speaking) stopSpeaking();
        else speak(text, rate);
      }}
      className={
        "inline-flex shrink-0 items-center justify-center rounded-full transition focus-visible:ring-4 focus-visible:ring-primary/30 data-[speaking]:text-primary " +
        (plain
          ? "size-11 text-primary hover:bg-primary-soft "
          : "border border-border bg-surface text-text-muted hover:bg-surface-2 hover:text-text data-[speaking]:border-primary " +
            (compact ? "size-11 " : "min-h-11 gap-2 px-4 text-sm font-bold ")) +
        (supported ? "" : "invisible ") +
        className
      }
    >
      <svg viewBox="0 0 24 24" width={plain ? 24 : 20} height={plain ? 24 : 20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {speaking ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
        ) : slow ? (
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
