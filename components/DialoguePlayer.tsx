"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AnnotatedLine } from "@/lib/dialogues";
import type { WordHit } from "@/lib/wordLookup";
import SpeakerAvatar from "./SpeakerAvatar";
import SpeakButton from "./SpeakButton";
import AddToReviewButton from "./AddToReviewButton";

type Display = "german" | "translation";
type Locale = "en" | "fa" | "de";

/** Chat-bubble view of a dialogue: German only or with translation, tap known words for their meaning. */
export default function DialoguePlayer({ lines, speakers }: { lines: AnnotatedLine[]; speakers: string[] }) {
  const t = useTranslations("Dialogues");
  const locale = useLocale() as Locale;
  const translationLocale = locale === "de" ? "en" : locale;

  const [display, setDisplay] = useState<Display>("german");
  const [word, setWord] = useState<WordHit | null>(null);

  const speakerIndex = (name: string): 0 | 1 => (speakers.indexOf(name) === 1 ? 1 : 0);

  return (
    <div className="space-y-4">
      <div role="group" aria-label={t("displayLabel")} className="flex flex-wrap gap-2">
        {(["german", "translation"] as const).map((d) => (
          <button key={d} type="button" aria-pressed={display === d} onClick={() => setDisplay(d)} className="pill">
            {t(`display.${d}`)}
          </button>
        ))}
      </div>
      <p className="text-sm text-text-muted">{t("tapHint")}</p>

      <div aria-live="polite" role="status" className="min-h-0">
        {word && (
          <div className="card flex items-start justify-between gap-3 p-4">
            <div className="space-y-1">
              <p className="text-lg font-extrabold">
                <bdi dir="ltr" lang="de">
                  {word.display}
                </bdi>
              </p>
              <p>{word.translations[translationLocale === "fa" ? "fa" : "en"]}</p>
              {word.inflected && (
                <p className="text-sm text-text-muted">
                  {t("inflected", { form: word.surface, base: word.display })}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <AddToReviewButton cardId={`${word.kind}:${word.id}`} word={word.display} compact />
              <button type="button" onClick={() => setWord(null)} className="btn-ghost">
                {t("closeWord")}
              </button>
            </div>
          </div>
        )}
      </div>

      <ol className="flex flex-col gap-4">
        {lines.map((line, i) => {
          const idx = speakerIndex(line.speaker);
          return (
            <li key={i} className={"flex max-w-[92%] gap-3 " + (idx === 0 ? "self-start" : "flex-row-reverse self-end")}>
              <div className="flex flex-col items-center gap-1 pt-1">
                <SpeakerAvatar index={idx} />
              </div>
              <div
                className={
                  "space-y-1 rounded-3xl border border-border px-4 py-3 shadow-soft " +
                  (idx === 0 ? "bg-surface" : "bg-primary-soft")
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">{line.speaker}</p>
                  <SpeakButton text={line.de} compact />
                </div>
                <p dir="ltr" lang="de" className="text-lg font-bold leading-relaxed">
                  {line.tokens.map((tok, j) =>
                    tok.hit ? (
                      <button
                        key={j}
                        type="button"
                        onClick={() => setWord(tok.hit)}
                        className="rounded-sm font-bold underline decoration-primary decoration-dotted decoration-2 underline-offset-4 hover:text-primary"
                      >
                        {tok.text}
                      </button>
                    ) : (
                      <span key={j}>{tok.text}</span>
                    ),
                  )}
                </p>
                {display === "translation" && (
                  <p lang={translationLocale} className="text-sm text-text-muted">
                    {line[translationLocale]}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
