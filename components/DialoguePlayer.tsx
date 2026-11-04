"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AnnotatedLine } from "@/lib/dialogues";
import type { WordHit } from "@/lib/wordLookup";
import SpeakerAvatar from "./SpeakerAvatar";
import SpeakButton from "./SpeakButton";
import AddToReviewButton from "./AddToReviewButton";
import ResponsiveSheet from "./ui/ResponsiveSheet";

type Display = "german" | "translation";
type Locale = "en" | "fa" | "de";

/**
 * Chat-bubble view of a dialogue: German only or with translation, tap known words for their meaning.
 * The meaning opens in a ResponsiveSheet (portalled), so nothing above the chat moves. Word buttons keep the text's
 * line flow and get a 44px tall hit area from a ::before pseudo-element.
 */
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
                        data-word
                        aria-haspopup="dialog"
                        onClick={() => setWord(tok.hit)}
                        className="relative rounded-sm font-bold before:absolute before:inset-x-0 before:-inset-y-3 before:content-[''] underline decoration-primary decoration-dotted decoration-2 underline-offset-4 hover:text-primary"
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

      <ResponsiveSheet open={word !== null} onClose={() => setWord(null)} title={word?.display ?? ""}>
        {word && (
          <div className="space-y-3">
            <p className="text-lg">{word.translations[translationLocale === "fa" ? "fa" : "en"]}</p>
            {word.inflected && <p className="text-sm text-text-muted">{t("inflected", { form: word.surface, base: word.display })}</p>}
            <AddToReviewButton cardId={`${word.kind}:${word.id}`} word={word.display} />
          </div>
        )}
      </ResponsiveSheet>
    </div>
  );
}
