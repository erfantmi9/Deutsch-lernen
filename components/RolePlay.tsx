"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildRolePlayChoices } from "@/lib/rolePlay";
import { useDialogueStore } from "@/stores/dialogueStore";
import type { DialogueLine } from "@/types/dialogue";
import Mascot from "./illustrations/Mascot";
import SpeakerAvatar from "./SpeakerAvatar";

type Locale = "en" | "fa" | "de";

interface Round {
  role: string;
  choices: Record<number, string[]>;
  /** Indices of the lines the learner has to answer. */
  mine: number[];
}

/**
 * The learner plays one speaker: the other speaker's lines appear by themselves,
 * and at every own line the right reply must be picked out of three.
 */
export default function RolePlay({
  dialogueId,
  lines,
  speakers,
  pool,
}: {
  dialogueId: string;
  lines: DialogueLine[];
  speakers: string[];
  pool: string[];
}) {
  const t = useTranslations("Dialogues.roleplay");
  const locale = useLocale() as Locale;
  const translationLocale = locale === "de" ? "en" : locale;
  const recordRolePlay = useDialogueStore((s) => s.recordRolePlay);

  const [round, setRound] = useState<Round | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const speakerIndex = (name: string): 0 | 1 => (speakers.indexOf(name) === 1 ? 1 : 0);

  const start = (role: string) => {
    setRound({
      role,
      choices: buildRolePlayChoices(lines, role, pool, Math.random),
      mine: lines.flatMap((l, i) => (l.speaker === role ? [i] : [])),
    });
    setStep(0);
    setPicked(null);
    setCorrectCount(0);
  };

  if (!round) {
    return (
      <section aria-labelledby="rp-title" className="card space-y-4 p-5 sm:p-6">
        <h3 id="rp-title" className="text-xl font-extrabold">
          {t("title")}
        </h3>
        <p className="text-text-muted">{t("intro")}</p>
        <div role="group" aria-label={t("chooseRole")} className="grid gap-3 sm:grid-cols-2">
          {speakers.map((name) => (
            <button key={name} type="button" onClick={() => start(name)} className="pill min-h-16 justify-start gap-3 py-2 text-base text-text">
              <SpeakerAvatar index={speakerIndex(name)} />
              <span>{t("playAs", { name })}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const done = step >= round.mine.length;
  const current = done ? lines.length : round.mine[step];
  const visible = done ? lines : lines.slice(0, picked ? current + 1 : current);
  const choices = done ? [] : round.choices[current];
  const wasRight = picked !== null && picked === lines[current]?.de;

  const choose = (choice: string) => {
    if (picked !== null) return;
    setPicked(choice);
    if (choice === lines[current].de) setCorrectCount((n) => n + 1);
  };

  const next = () => {
    if (step + 1 >= round.mine.length) recordRolePlay(dialogueId);
    setStep(step + 1);
    setPicked(null);
  };

  const otherRole = speakers.find((s) => s !== round.role) ?? round.role;

  return (
    <section aria-labelledby="rp-title" className="space-y-4">
      <h3 id="rp-title" className="text-xl font-extrabold">
        {t("title")}: {t("playAs", { name: round.role })}
      </h3>

      <ol className="flex flex-col gap-3">
        {visible.map((line, i) => {
          const idx = speakerIndex(line.speaker);
          const mine = line.speaker === round.role;
          return (
            <li key={i} className={"flex max-w-[92%] gap-3 " + (idx === 0 ? "self-start" : "flex-row-reverse self-end")}>
              <SpeakerAvatar index={idx} size={40} />
              <div
                className={
                  "space-y-1 rounded-3xl border px-4 py-3 shadow-soft " +
                  (mine ? "border-primary bg-primary-soft" : "border-border bg-surface")
                }
              >
                <p className="eyebrow">{line.speaker}</p>
                <p dir="ltr" lang="de" className="text-lg font-bold leading-relaxed">
                  {line.de}
                </p>
                <p lang={translationLocale} className="text-sm text-text-muted">
                  {line[translationLocale]}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div className="card space-y-3 p-5">
          <p className="font-bold">{t("yourTurn")}</p>
          <div role="group" aria-label={t("pickReply")} className="grid gap-3">
            {choices.map((c) => {
              const isAnswer = picked !== null && c === lines[current].de;
              const isWrongPick = picked !== null && c === picked && !wasRight;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => choose(c)}
                  className={
                    "pill min-h-14 justify-start whitespace-normal py-2 text-start text-base text-text disabled:cursor-default " +
                    (isAnswer
                      ? "border-success bg-success-soft text-success disabled:opacity-100"
                      : isWrongPick
                        ? "border-danger bg-danger-soft text-danger disabled:opacity-100"
                        : "disabled:opacity-60")
                  }
                >
                  <bdi dir="ltr" lang="de">
                    {c}
                  </bdi>
                  {isAnswer && <span aria-hidden="true"> ✓</span>}
                  {isWrongPick && <span aria-hidden="true"> ✗</span>}
                </button>
              );
            })}
          </div>

          <div aria-live="polite" role="status">
            {picked !== null && (
              <div className={"space-y-3 " + (wasRight ? "feedback-success" : "feedback-error")}>
                <div className="flex items-center gap-4">
                  <Mascot mood={wasRight ? "cheering" : "sad"} size={64} className="shrink-0" />
                  <p className="font-bold">
                    {wasRight ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}
                    {!wasRight && (
                      <>
                        {" "}
                        <bdi dir="ltr" lang="de" className="font-extrabold text-text">
                          {lines[current].de}
                        </bdi>
                      </>
                    )}
                  </p>
                </div>
                <button type="button" onClick={next} autoFocus className="btn btn-primary">
                  {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {done && (
        <div role="status" className="card-hero space-y-3 p-6 text-center">
          <Mascot mood={correctCount >= round.mine.length - 1 ? "cheering" : "thinking"} size={100} className="mx-auto" />
          <h4 className="text-2xl font-extrabold">{t("done")}</h4>
          <p>{t("summary", { correct: correctCount, total: round.mine.length })}</p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button type="button" onClick={() => start(round.role)} className="btn btn-primary">
              {t("again")}
            </button>
            <button type="button" onClick={() => start(otherRole)} className="btn btn-secondary">
              {t("otherRole")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
