"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { getSpeakingKey, RATE, speakSequence, speechKey, stopSpeaking, subscribeSpeech } from "@/lib/speech";
import type { SpokenPart } from "@/lib/speech";

/**
 * Plays several parts one after another (a conversation in two voices, an announcement); turns into Stop while it
 * plays. `id` names the sequence, so two buttons for the same text (normal and slow) know which one is playing.
 */
export default function SequenceButton({
  id,
  parts,
  slow = false,
  compact = false,
  className = "",
}: {
  id: string;
  parts: readonly SpokenPart[];
  slow?: boolean;
  /** Icon only. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("Listen");
  const tSpeech = useTranslations("Speech");
  const rate = slow ? RATE.slow : RATE.normal;
  const speaking = useSyncExternalStore(subscribeSpeech, getSpeakingKey, () => null) === speechKey(id, rate);

  useEffect(() => () => stopSpeaking(), []);

  const label = speaking ? tSpeech("stop") : slow ? t("playSlow") : t("play");
  return (
    <button
      type="button"
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      data-sequence-button={slow ? "slow" : "normal"}
      data-speaking={speaking ? "" : undefined}
      onClick={() => {
        if (speaking) stopSpeaking();
        else speakSequence(id, parts, rate);
      }}
      className={
        "inline-flex shrink-0 items-center justify-center rounded-full border transition focus-visible:ring-4 focus-visible:ring-primary/30 " +
        (slow
          ? "border-border bg-surface text-text-muted hover:bg-surface-2 hover:text-text data-[speaking]:border-primary data-[speaking]:text-primary "
          : "border-primary bg-primary text-on-primary hover:brightness-110 ") +
        (compact ? "size-11 " : "min-h-11 gap-2 px-4 text-sm font-bold ") +
        className
      }
    >
      <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {speaking ? (
          <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
        ) : slow ? (
          <path d="M5 15c0-5 3-8 8-8 4 0 6 3 6 6v2H5zM8 17v2M16 17v2M5 15 3 14" />
        ) : (
          <path d="M8 5v14l11-7z" fill="currentColor" />
        )}
      </svg>
      {!compact && <span>{label}</span>}
    </button>
  );
}
