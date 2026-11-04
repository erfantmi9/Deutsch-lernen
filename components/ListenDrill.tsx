"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildNumberQuestion, buildWordQuestion, checkListenAnswer, ROUND_LENGTH } from "@/lib/listenDrill";
import type { ListenKind, ListenQuestion } from "@/lib/listenDrill";
import type { ReviewCard } from "@/lib/reviewCards";
import { recordActivity } from "@/stores/activityStore";
import PageHeader from "./PageHeader";
import SpeakButton from "./SpeakButton";
import Mascot from "./illustrations/Mascot";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useSpeechSupport } from "./useSpeech";
import { RATE, speak, stopSpeaking } from "@/lib/speech";
import FeedbackRegion from "./ui/FeedbackRegion";
import StickyActionBar from "./ui/StickyActionBar";
import { useScrollIntoViewOnChange } from "./ui/useScrollIntoViewOnChange";

type Locale = "en" | "fa" | "de";

function makeQuestion(kind: ListenKind, cards: readonly ReviewCard[], locale: "en" | "fa", prev: ListenQuestion | null): ListenQuestion {
  return kind === "word"
    ? buildWordQuestion(cards, locale, Math.random, prev?.kind === "word" ? prev.cardId : undefined)
    : buildNumberQuestion(Math.random, prev?.kind === "number" ? prev.value : undefined);
}

export default function ListenDrill({ cards }: { cards: readonly ReviewCard[] }) {
  const t = useTranslations("Listen");
  const tUi = useTranslations("Ui");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;
  const { supported, germanVoice, voicesReady } = useSpeechSupport();
  // The drills only make sense with a German voice. Until the (asynchronous) voice list is known nothing is shown.
  const usable = supported && germanVoice;

  const [kind, setKind] = useState<ListenKind>("word");
  const [question, setQuestion] = useState<ListenQuestion | null>(null);
  const [given, setGiven] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [round, setRound] = useState({ asked: 0, correct: 0 });

  const [showResult, setShowResult] = useState(false);
  // A kind pill pressed mid-round: confirmed before the round is thrown away.
  const [pendingKind, setPendingKind] = useState<ListenKind | null>(null);
  const lastDone = round.asked >= ROUND_LENGTH && given !== null;
  const finished = showResult;
  const answered = given !== null;
  const right = question !== null && given !== null && checkListenAnswer(question, given);

  const actionRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Synchronous guard (state updates are async): one answer per question, one advance per answer.
  const answeredRef = useRef(false);
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(given, { enabled: given !== null, focus: false, block: "nearest" });

  // Leaving the page (a route change unmounts us) silences the voice.
  useEffect(() => () => stopSpeaking(), []);

  // Focus: the persistent bar button once answered; the number field for a new number question.
  useEffect(() => {
    if (!question || finished) return;
    if (answered) actionRef.current?.focus({ preventScroll: true });
    else if (question.kind === "number") inputRef.current?.focus({ preventScroll: true });
  }, [question, answered, finished]);

  /**
   * New question. `play` is true only when called synchronously from the learner's own Next tap / Enter, so the audio
   * is part of that gesture. The first question of a round is never played on its own: the learner taps Play.
   */
  const next = (k: ListenKind, fresh: boolean, play: boolean) => {
    const q = makeQuestion(k, cards, tr, fresh ? null : question);
    answeredRef.current = false;
    setQuestion(q);
    setGiven(null);
    setTyped("");
    if (play) speak(q.spoken, RATE.normal);
    else stopSpeaking();
  };

  const start = (k: ListenKind) => {
    setKind(k);
    setRound({ asked: 0, correct: 0 });
    setShowResult(false);
    next(k, true, false);
  };

  const submit = (answer: string) => {
    if (!question || answeredRef.current) return;
    answeredRef.current = true;
    const ok = checkListenAnswer(question, answer);
    setGiven(answer);
    setRound((r) => ({ asked: r.asked + 1, correct: r.correct + (ok ? 1 : 0) }));
    recordActivity();
  };

  const advance = () => {
    if (!answeredRef.current) return; // a second Enter / click for the same answer
    answeredRef.current = false;
    if (lastDone) {
      stopSpeaking();
      setShowResult(true);
    } else next(kind, false, true);
  };

  const onTyped = (e: FormEvent) => {
    e.preventDefault();
    if (answered) advance();
    else if (typed.trim() !== "") submit(typed);
  };

  const pickKind = (k: ListenKind) => {
    if (round.asked > 0 && !showResult) setPendingKind(k);
    else if (question === null) setKind(k);
    else start(k);
  };

  // The one persistent bar button: Start, then Check, then Next / See result, then Play another round.
  const empty = typed.trim() === "";
  const bar =
    question === null
      ? { label: t("start"), action: () => start(kind), disabled: false, status: null }
      : finished
        ? { label: t("again"), action: () => start(kind), disabled: false, status: null }
        : answered
          ? {
              label: lastDone ? (
                t("result")
              ) : (
                <>
                  {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                </>
              ),
              action: advance,
              disabled: false,
              status: null,
            }
          : question.kind === "number"
            ? { label: t("check"), action: () => submit(typed), disabled: empty, status: empty ? t("typeAnswer") : null }
            : { label: t("check"), action: () => {}, disabled: true, status: t("chooseAnswer") };

  const replay =
    question !== null && !finished ? (
      <div className="flex shrink-0 gap-2">
        <SpeakButton text={question.spoken} compact />
        <SpeakButton text={question.spoken} compact slow />
      </div>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <PageHeader title={t("title")} compact="always" />

      {voicesReady && !supported && <p className="feedback-hint">{t("unsupported")}</p>}
      {voicesReady && supported && !germanVoice && <p className="feedback-hint">{t("needVoice")}</p>}

      {usable && (
        <>
          <div role="group" aria-label={t("kindLabel")} className="flex flex-wrap gap-2">
            {(["word", "number"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => pickKind(k)} className="pill">
                {t(`kinds.${k}`)}
              </button>
            ))}
          </div>

          {question === null ? (
            <p className="card p-5 text-text-muted">{t("pick")}</p>
          ) : finished ? (
            <section className="card-hero space-y-4 p-6 text-center">
              <Mascot mood={round.correct >= 7 ? "cheering" : "thinking"} size={110} className="mx-auto" />
              <h2 className="text-2xl font-extrabold">{t("done")}</h2>
            </section>
          ) : (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="listen-q">
              <p id="listen-q" className="eyebrow">
                {t("question", { current: round.asked + (answered ? 0 : 1), total: ROUND_LENGTH })}
              </p>
              <p className="text-sm text-text-muted">
                {kind === "word" ? t("askWord") : t("askNumber")} {t("tapPlay")}
              </p>

              {question.kind === "word" ? (
                <div role="group" aria-labelledby="listen-q" className="grid gap-2 sm:grid-cols-2">
                  {question.options.map((opt) => {
                    const isAnswer = answered && opt === question.answer;
                    const isWrong = answered && opt === given && !right;
                    return (
                      <button
                        key={opt}
                        type="button"
                        lang={tr}
                        aria-disabled={answered}
                        onClick={() => submit(opt)}
                        className={
                          "pill min-h-12 justify-center whitespace-normal py-2 text-center aria-disabled:cursor-default " +
                          (isAnswer
                            ? "border-success bg-success-soft text-success"
                            : isWrong
                              ? "border-danger bg-danger-soft text-danger"
                              : answered
                                ? "opacity-60"
                                : "")
                        }
                      >
                        {opt}
                        {isAnswer && <span aria-hidden="true"> ✓</span>}
                        {isWrong && <span aria-hidden="true"> ✗</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <form onSubmit={onTyped} noValidate>
                  <label>
                    <span className="sr-only">{t("typeNumber")}</span>
                    <input
                      ref={inputRef}
                      id="listen-answer"
                      type="text"
                      inputMode="numeric"
                      enterKeyHint="done"
                      dir="ltr"
                      autoComplete="off"
                      value={typed}
                      readOnly={answered}
                      onChange={(e) => setTyped(e.target.value)}
                      placeholder={t("typeNumber")}
                      className="min-h-12 w-full rounded-full border-2 border-border bg-surface px-5 py-2 text-center text-xl font-bold outline-none read-only:opacity-60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                    />
                  </label>
                </form>
              )}
            </section>
          )}

          {question !== null && (
            <FeedbackRegion ref={feedbackRef} size="sm">
              {finished ? (
                <p className="text-center text-lg font-extrabold text-primary">{t("score", { correct: round.correct, total: round.asked })}</p>
              ) : (
                answered && (
                  <div className={right ? "feedback-success space-y-1" : "feedback-error space-y-1"}>
                    <p className="font-extrabold">{right ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}</p>
                    <p>
                      <bdi dir="ltr" lang="de" className="font-extrabold">
                        {question.spoken}
                      </bdi>
                      {question.kind === "number" ? ` = ${question.value}` : ` = ${question.answer}`}
                    </p>
                  </div>
                )
              )}
            </FeedbackRegion>
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
        </>
      )}

      <ConfirmDialog
        open={pendingKind !== null}
        title={tUi("restartTitle")}
        message={tUi("restartMessage", { done: round.asked })}
        confirmLabel={tUi("restartAction")}
        onCancel={() => setPendingKind(null)}
        onConfirm={() => {
          if (pendingKind) start(pendingKind);
          setPendingKind(null);
        }}
      />
    </div>
  );
}
