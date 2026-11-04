"use client";

import { useState } from "react";
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
import { RATE, speak } from "@/lib/speech";

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
  const { supported, germanVoice } = useSpeechSupport();

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

  const next = (k: ListenKind, fresh: boolean) => {
    const q = makeQuestion(k, cards, tr, fresh ? null : question);
    setQuestion(q);
    setGiven(null);
    setTyped("");
    speak(q.spoken, RATE.normal);
  };

  const start = (k: ListenKind) => {
    setKind(k);
    setRound({ asked: 0, correct: 0 });
    setShowResult(false);
    next(k, true);
  };

  const submit = (answer: string) => {
    if (!question || answered) return;
    const ok = checkListenAnswer(question, answer);
    setGiven(answer);
    setRound((r) => ({ asked: r.asked + 1, correct: r.correct + (ok ? 1 : 0) }));
    recordActivity();
  };

  const onTyped = (e: FormEvent) => {
    e.preventDefault();
    if (typed.trim() !== "") submit(typed);
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} illustration={<Mascot mood="waving" size={120} className="mx-auto" />} />

      {!supported ? (
        <p role="status" className="feedback-hint">
          {t("unsupported")}
        </p>
      ) : (
        !germanVoice && (
          <p role="status" className="feedback-hint">
            {t("noGermanVoice")}
          </p>
        )
      )}

      <div role="group" aria-label={t("kindLabel")} className="flex flex-wrap gap-2">
        {(["word", "number"] as const).map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => (round.asked > 0 && !showResult ? setPendingKind(k) : start(k))} disabled={!supported} className="pill">
            {t(`kinds.${k}`)}
          </button>
        ))}
      </div>
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

      {question === null ? (
        <p className="card p-5 text-text-muted">{t("pick")}</p>
      ) : finished ? (
        <section role="status" className="card-hero space-y-4 p-6 text-center">
          <Mascot mood={round.correct >= 7 ? "cheering" : "thinking"} size={110} className="mx-auto" />
          <h2 className="text-2xl font-extrabold">{t("done")}</h2>
          <p className="text-lg font-extrabold text-primary">{t("score", { correct: round.correct, total: round.asked })}</p>
          <button type="button" onClick={() => start(kind)} className="btn btn-primary">
            {t("again")}
          </button>
        </section>
      ) : (
        <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="listen-q">
          <div className="flex items-center justify-between gap-3">
            <p id="listen-q" className="eyebrow">
              {t("question", { current: round.asked + (answered ? 0 : 1), total: ROUND_LENGTH })}
            </p>
            <div className="flex gap-2">
              <SpeakButton text={question.spoken} compact />
              <SpeakButton text={question.spoken} compact slow />
            </div>
          </div>
          <p className="text-sm text-text-muted">{kind === "word" ? t("askWord") : t("askNumber")}</p>

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
                    disabled={answered}
                    onClick={() => submit(opt)}
                    className={
                      "pill min-h-12 justify-center whitespace-normal py-2 text-center disabled:cursor-default " +
                      (isAnswer
                        ? "border-success bg-success-soft text-success disabled:opacity-100"
                        : isWrong
                          ? "border-danger bg-danger-soft text-danger disabled:opacity-100"
                          : "disabled:opacity-60")
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
            <form onSubmit={onTyped} className="flex flex-wrap gap-3">
              <label className="flex-1">
                <span className="sr-only">{t("typeNumber")}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="off"
                  value={typed}
                  disabled={answered}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={t("typeNumber")}
                  className="min-h-12 w-full rounded-full border-2 border-border bg-surface px-5 py-2 text-center text-xl font-bold outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />
              </label>
              <button type="submit" disabled={answered || typed.trim() === ""} className="btn btn-primary">
                {t("check")}
              </button>
            </form>
          )}

          {answered && (
            <div role="status" className={right ? "feedback-success space-y-1" : "feedback-error space-y-1"}>
              <p className="font-extrabold">{right ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}</p>
              <p>
                <bdi dir="ltr" lang="de" className="font-extrabold">
                  {question.spoken}
                </bdi>
                {question.kind === "number" ? ` = ${question.value}` : ` = ${question.answer}`}
              </p>
            </div>
          )}

          {answered && (
            <button type="button" onClick={() => (lastDone ? setShowResult(true) : next(kind, false))} className="btn btn-primary w-full">
              {lastDone ? t("result") : t("next")}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
