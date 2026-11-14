"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { speakersOf } from "@/lib/rolePlay";
import { getSpeakingKey, getSpeakingPart, RATE, speechKey, subscribeSpeech } from "@/lib/speech";
import type { Dialogue } from "@/types/dialogue";
import { Link } from "@/i18n/navigation";
import DialogueQuiz from "../DialogueQuiz";
import PageHeader from "../PageHeader";
import SpeakButton from "../SpeakButton";
import SpeakerAvatar from "../SpeakerAvatar";
import BackToListen from "./BackToListen";
import SequenceButton from "./SequenceButton";
import SpeechGate from "./SpeechGate";

type Locale = "en" | "fa" | "de";

/**
 * A dialogue by ear: the text stays hidden. The learner reads the four questions, plays the whole conversation (two
 * voices, normal or slow) and answers. The transcript can be opened at any time, best after checking.
 */
export default function DialogueListen({ dialogue }: { dialogue: Dialogue }) {
  const t = useTranslations("Listen.dialogues");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;
  const [showText, setShowText] = useState(false);

  const speakers = speakersOf(dialogue.lines);
  const speakerIndex = (name: string): 0 | 1 => (speakers.indexOf(name) === 1 ? 1 : 0);
  const id = `dialogue:${dialogue.id}`;
  const parts = useMemo(() => {
    const names = speakersOf(dialogue.lines);
    return dialogue.lines.map((l) => ({ text: l.de, speaker: names.indexOf(l.speaker) === 1 ? (1 as const) : (0 as const) }));
  }, [dialogue]);

  const key = useSyncExternalStore(subscribeSpeech, getSpeakingKey, () => null);
  const part = useSyncExternalStore(subscribeSpeech, getSpeakingPart, () => null);
  const playing = key === speechKey(id, RATE.normal) || key === speechKey(id, RATE.slow);
  const line = playing && part !== null ? dialogue.lines[part] : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <BackToListen />
      <PageHeader title={dialogue.title[locale]} subtitle={dialogue.setting[locale]} compact="always" />

      <SpeechGate>
        <section className="card space-y-4 p-5" aria-labelledby="dl-player">
          <h2 id="dl-player" className="text-lg font-extrabold">
            {t("player")}
          </h2>
          <p className="text-sm text-text-muted">{t("how")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <SequenceButton id={id} parts={parts} />
            <SequenceButton id={id} parts={parts} slow />
          </div>
          {/* Who is speaking: a visual aid only (a live region would talk over the voice). */}
          <div aria-hidden="true" className="flex min-h-11 items-center gap-3 text-sm font-bold text-text-muted" data-now-speaking={line ? part : undefined}>
            {line ? (
              <>
                <SpeakerAvatar index={speakerIndex(line.speaker)} name={line.speaker} size={36} />
                <span>
                  {line.speaker} · {t("line", { current: (part ?? 0) + 1, total: dialogue.lines.length })}
                </span>
              </>
            ) : (
              <span>{t("speakers", { a: speakers[0], b: speakers[1] ?? "" })}</span>
            )}
          </div>
        </section>

        <DialogueQuiz dialogueId={dialogue.id} quiz={dialogue.quiz} />

        <section className="card space-y-3 p-5">
          <button type="button" aria-expanded={showText} aria-controls="dl-transcript" onClick={() => setShowText((v) => !v)} className="btn-ghost">
            {showText ? t("hideText") : t("showText")}
          </button>
          {showText && (
            <ol id="dl-transcript" className="space-y-3">
              {dialogue.lines.map((l, i) => (
                <li key={i} className="flex items-start gap-3">
                  <SpeakerAvatar index={speakerIndex(l.speaker)} name={l.speaker} size={36} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="eyebrow">{l.speaker}</p>
                    <p dir="ltr" lang="de" className="font-bold leading-relaxed">
                      {l.de}
                    </p>
                    <p lang={tr} className="text-sm text-text-muted">
                      {l[tr]}
                    </p>
                  </div>
                  <SpeakButton text={l.de} compact />
                </li>
              ))}
            </ol>
          )}
          <p className="text-sm">
            <Link href={`/dialogues/${dialogue.id}`} className="font-bold text-primary underline-offset-4 hover:underline">
              {t("openDialogue")}
            </Link>
          </p>
        </section>
      </SpeechGate>
    </div>
  );
}
