"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useNumbersStore } from "@/stores/numbersStore";
import { formatClock, formatPrice, writtenDate } from "@/lib/numbers";
import { monthName } from "@/lib/numbersData";
import { checkQuestion, makeQuestion, NUMBER_DRILL_KINDS, totalCorrect } from "@/lib/numbersDrill";
import type { NumberDrillKind, NumberQuestion, QuestionResult } from "@/lib/numbersDrill";
import type { ClockTime } from "@/types/numbers";
import AnalogClock from "./AnalogClock";
import { ClockSliders } from "./ClockExplorer";
import Mascot from "./illustrations/Mascot";
import SpecialCharBar from "./SpecialCharBar";
import ConfirmDialog from "./ui/ConfirmDialog";

const START_CLOCK: ClockTime = { hour: 12, minute: 0 };

interface Outcome extends QuestionResult {
  /** What the learner answered, shown for clock questions. */
  given?: string;
}

/** Drills for every number topic: words, digits, prices, dates, reading and setting the clock. */
export default function NumbersDrill() {
  const t = useTranslations("Numbers");
  const tUi = useTranslations("Ui");
  const inputId = useId();

  const kind = useNumbersStore((s) => s.kind);
  const setKind = useNumbersStore((s) => s.setKind);
  const streak = useNumbersStore((s) => s.streak);
  const bestStreak = useNumbersStore((s) => s.bestStreak);
  const solved = useNumbersStore((s) => totalCorrect(s));
  const recordResult = useNumbersStore((s) => s.recordResult);
  const reset = useNumbersStore((s) => s.reset);

  const [ready, setReady] = useState(false);
  const [question, setQuestion] = useState<NumberQuestion | null>(null);
  const [input, setInput] = useState("");
  const [clock, setClock] = useState<ClockTime>(START_CLOCK);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [askReset, setAskReset] = useState(false);
  // A kind pill pressed while an unchecked answer is in progress: confirmed before that answer is thrown away.
  const [pendingKind, setPendingKind] = useState<NumberDrillKind | null>(null);

  const newQuestion = useCallback((k: NumberDrillKind) => {
    setQuestion(makeQuestion(k));
    setInput("");
    setClock(START_CLOCK);
    setOutcome(null);
  }, []);

  // Persisted progress loads on the client only, after mount (the questions are random, so they start here too).
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useNumbersStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      newQuestion(useNumbersStore.getState().kind);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [newQuestion]);

  const typed = question !== null && ["cardinal", "reverse", "price", "date"].includes(question.kind);

  useEffect(() => {
    if (typed && !outcome) inputRef.current?.focus();
  }, [typed, outcome, question]);

  const applyKind = (k: NumberDrillKind) => {
    setKind(k);
    newQuestion(k);
  };
  const inProgress = !outcome && (input.trim() !== "" || clock.hour !== START_CLOCK.hour || clock.minute !== START_CLOCK.minute);
  const changeKind = (k: NumberDrillKind) => {
    if (inProgress) setPendingKind(k);
    else applyKind(k);
  };

  const finish = (q: NumberQuestion, response: string | ClockTime, given?: string) => {
    const res = checkQuestion(q, response);
    setOutcome({ ...res, given });
    recordResult(q.kind, res.correct);
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    if (question && !outcome && input.trim().length > 0) finish(question, input);
  };

  const insertChar = (ch: string) => {
    const el = inputRef.current;
    if (!el) {
      setInput((v) => v + ch);
      return;
    }
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? start;
    setInput(input.slice(0, start) + ch + input.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    });
  };

  if (!ready || !question) {
    return (
      <div role="status" className="py-12 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  const prompt = (() => {
    switch (question.kind) {
      case "cardinal":
        return <span className="tabular-nums">{question.n}</span>;
      case "reverse":
        return (
          <bdi dir="ltr" lang="de">
            {question.words}
          </bdi>
        );
      case "price":
        return <span className="tabular-nums">{formatPrice(question.euros, question.cents)}</span>;
      case "date":
        return (
          <bdi dir="ltr" lang="de">
            {writtenDate(question.day, monthName(question.month))}
          </bdi>
        );
      case "clock-set":
        return (
          <bdi dir="ltr" lang="de">
            {question.phrase}
          </bdi>
        );
      default:
        return null;
    }
  })();

  return (
    <section aria-labelledby="drill-title" className="mx-auto w-full max-w-xl space-y-5">
      <h2 id="drill-title" className="sr-only">
        {t("tabs.practice")}
      </h2>

      <div role="group" aria-label={t("practice.kindLabel")} className="flex flex-wrap gap-2">
        {NUMBER_DRILL_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)} className="pill">
            {t(`practice.kinds.${k}`)}
          </button>
        ))}
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            [t("practice.solved"), solved],
            [t("practice.streak"), streak],
            [t("practice.best"), bestStreak],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="stat">
            <dt className="eyebrow">{label}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="card-hero space-y-3 p-6 text-center">
        <p className="eyebrow">
          {question.kind === "clock-set" ? t(`practice.styles.${question.style}`) : t(`practice.kinds.${question.kind}`)}
        </p>
        <p className="font-bold">{t(`practice.prompts.${question.kind}`)}</p>
        {prompt && <p className="text-4xl font-extrabold">{prompt}</p>}
        {question.kind === "clock-read" && (
          <AnalogClock
            time={question.time}
            label={t("clock.label", { time: formatClock(question.time) })}
            size={224}
            className="mx-auto"
          />
        )}
      </div>

      {/* Typed answers */}
      {typed && (
        <form onSubmit={submitTyped} className="space-y-4" noValidate>
          <div>
            <label htmlFor={inputId} className="mb-1 block text-sm font-bold text-text-muted">
              {question.kind === "reverse" ? t("practice.typeDigits") : t("practice.typeWords")}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={outcome !== null}
              dir="ltr"
              lang={question.kind === "reverse" ? undefined : "de"}
              inputMode={question.kind === "reverse" ? "numeric" : "text"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full rounded-full border-2 border-border bg-surface px-6 py-3 text-xl text-text shadow-soft outline-none placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-60"
            />
          </div>
          {question.kind !== "reverse" && <SpecialCharBar disabled={outcome !== null} onInsert={insertChar} />}
          {!outcome && (
            <button type="submit" disabled={input.trim().length === 0} className="btn btn-primary w-full py-3 text-lg">
              {t("practice.check")}
            </button>
          )}
        </form>
      )}

      {/* Read the clock: choose the phrase */}
      {question.kind === "clock-read" && (
        <div role="group" aria-label={t("practice.chooseTime")} className="grid gap-3 sm:grid-cols-2">
          {question.options.map((opt) => {
            const isAnswer = outcome !== null && opt === question.answer;
            const isWrongPick = outcome !== null && !outcome.correct && opt === outcome.given;
            return (
              <button
                key={opt}
                type="button"
                disabled={outcome !== null}
                onClick={() => finish(question, opt, opt)}
                className={
                  "pill min-h-14 justify-center text-lg text-text disabled:cursor-default " +
                  (isAnswer
                    ? "border-success bg-success-soft text-success disabled:opacity-100"
                    : isWrongPick
                      ? "border-danger bg-danger-soft text-danger disabled:opacity-100"
                      : "disabled:opacity-60")
                }
              >
                <bdi dir="ltr" lang="de">
                  {opt}
                </bdi>
                {isAnswer && <span aria-hidden="true"> ✓</span>}
                {isWrongPick && <span aria-hidden="true"> ✗</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Set the clock */}
      {question.kind === "clock-set" && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <AnalogClock
              time={clock}
              onChange={outcome ? undefined : setClock}
              label={t("clock.label", { time: formatClock(clock) })}
              size={224}
            />
            <p className="text-sm text-text-muted">{t("clock.hint")}</p>
          </div>
          {!outcome && (
            <>
              <ClockSliders time={clock} onChange={setClock} />
              <button type="button" onClick={() => finish(question, clock, formatClock(clock))} className="btn btn-primary w-full py-3 text-lg">
                {t("practice.check")}
              </button>
            </>
          )}
        </div>
      )}

      {/* Feedback */}
      <div aria-live="polite" role="status" className="min-h-[5rem]">
        {outcome && (
          <div className={"space-y-3 " + (outcome.correct ? "feedback-success" : "feedback-error")}>
            <div className="flex items-center gap-4">
              <Mascot
                mood={outcome.correct ? "cheering" : "sad"}
                size={80}
                className={"shrink-0 " + (outcome.correct ? "motion-safe:animate-bounce-soft" : "")}
              />
              <p className="font-bold">
                {outcome.correct ? `✓ ${t("practice.correct")}` : `✗ ${t("practice.wrong")}`}{" "}
                <bdi dir="ltr" lang="de" className="font-extrabold text-text">
                  {outcome.expected}
                </bdi>
              </p>
            </div>
            {question.kind === "clock-set" && !outcome.correct && outcome.given && (
              <p className="text-sm text-text">{t("practice.yourClock", { time: outcome.given })}</p>
            )}
            {outcome.umlaut && <p className="feedback-hint">⚠ {t("practice.umlautHint")}</p>}
            <button type="button" onClick={() => newQuestion(kind)} autoFocus className="btn btn-primary">
              {t("practice.next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </button>
          </div>
        )}
      </div>

      <div className="text-end">
        <button type="button" onClick={() => setAskReset(true)} aria-haspopup="dialog" className="btn-ghost">
          {t("practice.reset")}
        </button>
        <ConfirmDialog
          open={askReset}
          title={tUi("resetTitle")}
          message={tUi("resetMessage", { area: t("tabs.practice") })}
          confirmLabel={tUi("resetAction")}
          onCancel={() => setAskReset(false)}
          onConfirm={() => {
            reset();
            setAskReset(false);
          }}
        />
        <ConfirmDialog
          open={pendingKind !== null}
          title={tUi("discardTitle")}
          message={tUi("discardMessage")}
          confirmLabel={tUi("switchAction")}
          onCancel={() => setPendingKind(null)}
          onConfirm={() => {
            if (pendingKind) applyKind(pendingKind);
            setPendingKind(null);
          }}
        />
      </div>
    </section>
  );
}
