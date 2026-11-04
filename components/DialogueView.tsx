"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { speakersOf } from "@/lib/rolePlay";
import type { AnnotatedLine, ResolvedWord } from "@/lib/dialogues";
import type { Dialogue } from "@/types/dialogue";
import type { I18n3 } from "@/types/common";
import DialoguePlayer from "./DialoguePlayer";
import DialogueQuiz from "./DialogueQuiz";
import AddToReviewButton from "./AddToReviewButton";
import PageHeader from "./PageHeader";
import RolePlay from "./RolePlay";
import DialogueTopicIcon from "./illustrations/DialogueTopicIcon";

type Locale = "en" | "fa" | "de";
type Mode = "read" | "roleplay" | "quiz";
const MODES: readonly Mode[] = ["read", "roleplay", "quiz"];

export interface DialogueLink {
  id: string;
  title: I18n3;
}

/** One dialogue page: read it, play a role, or take the comprehension quiz. */
export default function DialogueView({
  dialogue,
  annotated,
  pool,
  words,
  lessons,
  prev,
  next,
}: {
  dialogue: Dialogue;
  annotated: AnnotatedLine[];
  pool: string[];
  words: ResolvedWord[];
  lessons: DialogueLink[];
  prev: DialogueLink | null;
  next: DialogueLink | null;
}) {
  const t = useTranslations("Dialogues");
  const locale = useLocale() as Locale;
  const [mode, setMode] = useState<Mode>("read");
  const speakers = speakersOf(dialogue.lines);
  const translationLocale = locale === "de" ? "en" : locale;

  return (
    <div className="space-y-6">
      <Link href="/dialogues" className="btn-ghost">
        <span aria-hidden="true" className="me-1 rtl:-scale-x-100">←</span> {t("back")}
      </Link>

      <PageHeader
        compact
        title={dialogue.title[locale]}
        subtitle={`${t("setting")}: ${dialogue.setting[locale]}`}
        illustration={
          <div className="mx-auto w-20 sm:w-28">
            <DialogueTopicIcon topic={dialogue.topic} size="100%" />
          </div>
        }
      />

      <div role="group" aria-label={t("modeLabel")} className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className="pill">
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>

      {mode === "read" && <DialoguePlayer lines={annotated} speakers={speakers} />}
      {mode === "roleplay" && <RolePlay dialogueId={dialogue.id} lines={dialogue.lines} speakers={speakers} pool={pool} />}
      {mode === "quiz" && <DialogueQuiz dialogueId={dialogue.id} quiz={dialogue.quiz} />}

      {words.length > 0 && (
        <section aria-labelledby="dw-title" className="card space-y-3 p-5">
          <h2 id="dw-title" className="text-lg font-extrabold">
            {t("words")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {words.map((w) => (
              <li key={w.id} className="flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1 ps-3 pe-1 text-sm">
                <span>
                  <bdi dir="ltr" lang="de" className="font-extrabold">
                    {w.display}
                  </bdi>{" "}
                  <span className="text-text-muted">{w.translations[translationLocale === "fa" ? "fa" : "en"]}</span>
                </span>
                <AddToReviewButton cardId={w.id} word={w.display} compact />
              </li>
            ))}
          </ul>
        </section>
      )}

      {lessons.length > 0 && (
        <section aria-labelledby="dl-title" className="card space-y-3 p-5">
          <h2 id="dl-title" className="text-lg font-extrabold">
            {t("related")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link href={`/grammar/${l.id}`} className="pill">
                  {l.title[locale]}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label={t("listLabel")} className="flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link href={`/dialogues/${prev.id}`} className="btn btn-secondary">
            <span aria-hidden="true" className="rtl:-scale-x-100">←</span> {t("prev")}: {prev.title[locale]}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/dialogues/${next.id}`} className="btn btn-secondary">
            {t("next")}: {next.title[locale]} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
