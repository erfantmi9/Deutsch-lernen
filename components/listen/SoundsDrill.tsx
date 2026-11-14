"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { soundAccuracy } from "@/lib/listenStats";
import { RATE, speak, stopSpeaking } from "@/lib/speech";
import { SOUND_CONTRASTS } from "@/types/listening";
import type { MinimalPair, SoundContrast } from "@/types/listening";
import { useListenStore } from "@/stores/listenStore";
import PageHeader from "../PageHeader";
import SpeakButton from "../SpeakButton";
import Mascot from "../illustrations/Mascot";
import ConfirmDialog from "../ui/ConfirmDialog";
import FeedbackRegion from "../ui/FeedbackRegion";
import StickyActionBar from "../ui/StickyActionBar";
import { useScrollIntoViewOnChange } from "../ui/useScrollIntoViewOnChange";
import BackToListen from "./BackToListen";
import SpeechGate from "./SpeechGate";

type Locale = "en" | "fa" | "de";
type ContrastFilter = SoundContrast | "mixed";

export const SOUNDS_ROUND = 10;

interface SoundQuestion {
  pair: MinimalPair;
  /** Which of the two words is spoken. */
  spoken: "a" | "b";
}

/** A new question: never the same pair twice in a row when there is a choice. */
function nextQuestion(pairs: readonly MinimalPair[], filter: ContrastFilter, prev: SoundQuestion | null): SoundQuestion {
  const pool = pairs.filter((p) => filter === "mixed" || p.contrast === filter);
  const choices = pool.length > 1 ? pool.filter((p) => p.id !== prev?.pair.id) : pool;
  const pair = choices[Math.floor(Math.random() * choices.length)];
  return { pair, spoken: Math.random() < 0.5 ? "a" : "b" };
}

/**
 * Minimal pairs: two words that differ in one sound (schon / schön). One is spoken, the learner picks which. Each
 * contrast has a short tip on how the sounds differ, and the per-contrast accuracy shows which sounds need work.
 */
export default function SoundsDrill({ pairs }: { pairs: MinimalPair[] }) {
  const t = useTranslations("Listen.sounds");
  const tL = useTranslations("Listen");
  const tUi = useTranslations("Ui");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const scores = useListenStore((s) => s.sounds);
  const recordSound = useListenStore((s) => s.recordSound);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useListenStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [filter, setFilter] = useState<ContrastFilter>("mixed");
  const [question, setQuestion] = useState<SoundQuestion | null>(null);
  const [given, setGiven] = useState<"a" | "b" | null>(null);
  const [round, setRound] = useState({ asked: 0, correct: 0 });
  const [finished, setFinished] = useState(false);
  const [pendingFilter, setPendingFilter] = useState<ContrastFilter | null>(null);

  const actionRef = useRef<HTMLButtonElement>(null);
  const answeredRef = useRef(false);
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(given, { enabled: given !== null, focus: false, block: "nearest" });

  useEffect(() => () => stopSpeaking(), []);

  const answered = given !== null;
  const right = question !== null && given === question.spoken;
  const spokenWord = question ? question.pair[question.spoken].de : "";
  const lastDone = round.asked >= SOUNDS_ROUND && answered;

  useEffect(() => {
    if (answered) actionRef.current?.focus({ preventScroll: true });
  }, [answered]);

  // Contrasts with the lowest accuracy first, for the "practise these" hint.
  const weakest = useMemo(
    () =>
      SOUND_CONTRASTS.map((c) => ({ c, acc: soundAccuracy(scores[c]) }))
        .filter((x): x is { c: SoundContrast; acc: number } => x.acc !== null && x.acc < 0.8)
        .sort((a, b) => a.acc - b.acc)
        .slice(0, 2),
    [scores],
  );

  const next = (f: ContrastFilter, fresh: boolean, play: boolean) => {
    const q = nextQuestion(pairs, f, fresh ? null : question);
    answeredRef.current = false;
    setQuestion(q);
    setGiven(null);
    if (play) speak(q.pair[q.spoken].de, RATE.normal);
    else stopSpeaking();
  };

  const start = (f: ContrastFilter) => {
    setFilter(f);
    setRound({ asked: 0, correct: 0 });
    setFinished(false);
    next(f, true, false);
  };

  const answer = (side: "a" | "b") => {
    if (!question || answeredRef.current) return;
    answeredRef.current = true;
    const ok = side === question.spoken;
    setGiven(side);
    setRound((r) => ({ asked: r.asked + 1, correct: r.correct + (ok ? 1 : 0) }));
    recordSound(question.pair.contrast, ok);
  };

  const advance = () => {
    if (!answeredRef.current) return;
    answeredRef.current = false;
    if (lastDone) {
      stopSpeaking();
      setFinished(true);
    } else next(filter, false, true);
  };

  const pickFilter = (f: ContrastFilter) => {
    if (round.asked > 0 && !finished) setPendingFilter(f);
    else if (question === null) setFilter(f);
    else start(f);
  };

  const bar =
    question === null
      ? { label: tL("start"), action: () => start(filter), disabled: false, status: null }
      : finished
        ? { label: tL("again"), action: () => start(filter), disabled: false, status: null }
        : answered
          ? {
              label: lastDone ? (
                tL("result")
              ) : (
                <>
                  {tL("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                </>
              ),
              action: advance,
              disabled: false,
              status: null,
            }
          : { label: tL("check"), action: () => {}, disabled: true, status: t("which") };

  const replay =
    question !== null && !finished ? (
      <div className="flex shrink-0 gap-2">
        <SpeakButton text={spokenWord} compact hideText />
        <SpeakButton text={spokenWord} compact slow hideText />
      </div>
    ) : null;

  const tipContrast: SoundContrast | null = question && !finished ? question.pair.contrast : filter === "mixed" ? null : filter;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <BackToListen />
      <PageHeader title={t("title")} compact="always" />

      <SpeechGate>
        <div role="group" aria-label={t("contrastLabel")} className="flex flex-wrap gap-2">
          {(["mixed", ...SOUND_CONTRASTS] as const).map((c) => {
            const acc = c === "mixed" ? null : soundAccuracy(scores[c]);
            return (
              <button key={c} type="button" aria-pressed={filter === c} onClick={() => pickFilter(c)} className="pill" lang={c === "mixed" ? undefined : "de"}>
                <span dir={c === "mixed" ? undefined : "ltr"}>{c === "mixed" ? t("mixed") : t(`contrasts.${c}.label`)}</span>
                {ready && acc !== null && (
                  <span className="text-xs font-bold opacity-70" dir="ltr">
                    {" "}
                    · {Math.round(acc * 100)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {question === null && (
          <section className="card space-y-3 p-5">
            <p>{t("intro")}</p>
            {ready && weakest.length > 0 && (
              <p className="text-sm font-bold text-text-muted">
                {t("weakest")}{" "}
                {weakest.map((w, i) => (
                  <span key={w.c}>
                    {i > 0 && (locale === "fa" ? "، " : ", ")}
                    <bdi dir="ltr" lang="de">
                      {t(`contrasts.${w.c}.label`)}
                    </bdi>
                  </span>
                ))}
              </p>
            )}
          </section>
        )}

        {tipContrast && (
          <details className="card p-4 text-sm" open={question === null}>
            <summary className="cursor-pointer font-extrabold">
              {t("tipTitle")}:{" "}
              <bdi dir="ltr" lang="de">
                {t(`contrasts.${tipContrast}.label`)}
              </bdi>
            </summary>
            <p className="pt-2 text-text-muted">{t(`contrasts.${tipContrast}.tip`)}</p>
          </details>
        )}

        {question !== null &&
          (finished ? (
            <section className="card-hero space-y-4 p-6 text-center">
              <Mascot mood={round.correct >= 8 ? "celebrating" : "listening"} size={110} className="mx-auto" />
              <h2 className="text-2xl font-extrabold">{tL("done")}</h2>
            </section>
          ) : (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="sounds-q">
              <p id="sounds-q" className="eyebrow">
                {tL("question", { current: round.asked + (answered ? 0 : 1), total: SOUNDS_ROUND })}
              </p>
              <p className="text-sm text-text-muted">
                {t("ask")} {round.asked === 0 && !answered ? tL("tapPlay") : ""}
              </p>
              <div role="group" aria-labelledby="sounds-q" className="grid grid-cols-2 gap-3">
                {(["a", "b"] as const).map((side) => {
                  const w = question.pair[side];
                  const isAnswer = answered && side === question.spoken;
                  const isWrong = answered && side === given && !right;
                  return (
                    <button
                      key={side}
                      type="button"
                      aria-disabled={answered}
                      onClick={() => answer(side)}
                      className={
                        "card flex min-h-24 flex-col items-center justify-center gap-1 p-4 text-center transition aria-disabled:cursor-default " +
                        (isAnswer
                          ? "border-success bg-success-soft text-success"
                          : isWrong
                            ? "border-danger bg-danger-soft text-danger"
                            : answered
                              ? "opacity-70"
                              : "hover:-translate-y-0.5 hover:shadow-lift")
                      }
                    >
                      <span dir="ltr" lang="de" className="text-2xl font-extrabold">
                        {w.de}
                        {isAnswer && <span aria-hidden="true"> ✓</span>}
                        {isWrong && <span aria-hidden="true"> ✗</span>}
                      </span>
                      <span lang={tr} className="text-sm text-text-muted">
                        {w.translation[tr]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

        {question !== null && (
          <FeedbackRegion ref={feedbackRef} size="sm">
            {finished ? (
              <p className="text-center text-lg font-extrabold text-primary">{tL("score", { correct: round.correct, total: round.asked })}</p>
            ) : (
              answered && (
                <div className={right ? "feedback-success" : "feedback-error"}>
                  <p className="font-extrabold">
                    {right ? `✓ ${tL("correct")}` : `✗ ${t("itWas")}`}{" "}
                    {!right && (
                      <bdi dir="ltr" lang="de">
                        {spokenWord}
                      </bdi>
                    )}
                  </p>
                </div>
              )
            )}
          </FeedbackRegion>
        )}

        {answered && question && !finished && (
          <section className="card space-y-2 p-4" aria-label={t("compare")}>
            <p className="text-sm font-bold text-text-muted">{t("compare")}</p>
            <div className="flex flex-wrap gap-4">
              {(["a", "b"] as const).map((side) => (
                <span key={side} className="flex items-center gap-2">
                  <SpeakButton text={question.pair[side].de} compact />
                  <bdi dir="ltr" lang="de" className="font-extrabold">
                    {question.pair[side].de}
                  </bdi>
                </span>
              ))}
            </div>
          </section>
        )}

        <StickyActionBar
          ref={actionRef}
          label={bar.label}
          onAction={bar.action}
          disabled={bar.disabled}
          status={bar.status}
          statusLive={false}
          secondary={replay}
          toolbar={replay}
        />
      </SpeechGate>

      <ConfirmDialog
        open={pendingFilter !== null}
        title={tUi("restartTitle")}
        message={tUi("restartMessage", { done: round.asked })}
        confirmLabel={tUi("restartAction")}
        onCancel={() => setPendingFilter(null)}
        onConfirm={() => {
          if (pendingFilter) start(pendingFilter);
          setPendingFilter(null);
        }}
      />
    </div>
  );
}
