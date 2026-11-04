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
import FeedbackRegion from "./ui/FeedbackRegion";
import StickyActionBar from "./ui/StickyActionBar";
import { useKeyboardInset } from "./ui/useKeyboardInset";
import { useScrollIntoViewOnChange } from "./ui/useScrollIntoViewOnChange";

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
  const actionRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Synchronous guard (state is async): a double Enter / double click checks or advances exactly once.
  const doneRef = useRef(false);
  const keyboard = useKeyboardInset();
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(outcome, { enabled: outcome !== null, focus: false, block: "nearest" });
  const [askReset, setAskReset] = useState(false);
  // A kind pill pressed while an unchecked answer is in progress: confirmed before that answer is thrown away.
  const [pendingKind, setPendingKind] = useState<NumberDrillKind | null>(null);

  const newQuestion = useCallback((k: NumberDrillKind) => {
    doneRef.current = false;
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

  // Focus: the answer field for a new typed question; the persistent bar button once answered (focus never drops).
  useEffect(() => {
    if (!question) return;
    if (outcome) actionRef.current?.focus({ preventScroll: true });
    else if (typed) inputRef.current?.focus();
  }, [typed, outcome, question]);

  // Keyboard open: keep the prompt + field above the keyboard bar.
  useEffect(() => {
    if (keyboard > 0) formRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [keyboard]);

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
    if (doneRef.current) return;
    doneRef.current = true;
    const res = checkQuestion(q, response);
    setOutcome({ ...res, given });
    recordResult(q.kind, res.correct);
  };

  const advance = () => {
    if (!doneRef.current) return;
    newQuestion(kind);
  };

  const check = () => {
    if (!question || doneRef.current) return;
    if (question.kind === "clock-set") finish(question, clock, formatClock(clock));
    else if (typed && input.trim().length > 0) finish(question, input);
  };

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    if (outcome) advance();
    else check();
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

  // Why Check is disabled, spelled out in the bar.
  const missing =
    question.kind === "clock-read" ? t("practice.missingChoice") : typed && input.trim().length === 0 ? t("practice.missingAnswer") : null;

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
    <section aria-labelledby="drill-title" className="mx-auto w-full max-w-xl space-y-4">
      <h2 id="drill-title" className="sr-only">
        {t("tabs.practice")}
      </h2>

      <div role="group" aria-label={t("practice.kindLabel")} className="kb-hide flex flex-wrap gap-2">
        {NUMBER_DRILL_KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => changeKind(k)} className="pill">
            {t(`practice.kinds.${k}`)}
          </button>
        ))}
      </div>

      {/* Scoreboard: one compact row so the question and its feedback fit on a phone. */}
      <dl className="kb-hide flex items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm shadow-soft">
        {(
          [
            [t("practice.solved"), solved],
            [t("practice.streak"), streak],
            [t("practice.best"), bestStreak],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-1.5">
            <dt className="eyebrow">{label}</dt>
            <dd className="font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="card-hero kb-tight space-y-2 p-4 text-center sm:p-6">
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
        <form ref={formRef} onSubmit={submitTyped} className="scroll-target space-y-3" noValidate>
          <div>
            <label htmlFor={inputId} className="kb-sr mb-1 block text-sm font-bold text-text-muted">
              {question.kind === "reverse" ? t("practice.typeDigits") : t("practice.typeWords")}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={outcome !== null}
              dir="ltr"
              lang={question.kind === "reverse" ? undefined : "de"}
              inputMode={question.kind === "reverse" ? "numeric" : "text"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="done"
              className="w-full rounded-full border-2 border-border bg-surface px-6 py-3 text-xl text-text shadow-soft outline-none placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 read-only:opacity-60"
            />
          </div>
          {question.kind !== "reverse" && keyboard === 0 && <SpecialCharBar disabled={outcome !== null} onInsert={insertChar} />}
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
                aria-disabled={outcome !== null}
                onClick={() => finish(question, opt, opt)}
                className={
                  "pill min-h-14 justify-center text-lg text-text aria-disabled:cursor-default " +
                  (isAnswer
                    ? "border-success bg-success-soft text-success"
                    : isWrongPick
                      ? "border-danger bg-danger-soft text-danger"
                      : outcome !== null
                        ? "opacity-60"
                        : "")
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
          {/* Kept mounted (locked) after answering: unmounting them collapsed the page by ~200px. Check is in the bar. */}
          <ClockSliders time={clock} onChange={setClock} disabled={outcome !== null} />
        </div>
      )}

      {/* Feedback: the page's one live region, height reserved so nothing jumps when it fills. */}
      <FeedbackRegion ref={feedbackRef}>
        {outcome && (
          <div className={"space-y-2 " + (outcome.correct ? "feedback-success" : "feedback-error")}>
            <div className="flex items-center gap-3">
              <Mascot
                mood={outcome.correct ? "cheering" : "sad"}
                size={56}
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
          </div>
        )}
      </FeedbackRegion>

      <div className="text-end">
        <button type="button" onClick={() => setAskReset(true)} aria-haspopup="dialog" className="btn-ghost">
          {t("practice.reset")}
        </button>
        <StickyActionBar
          ref={actionRef}
          label={
            outcome ? (
              <>
                {t("practice.next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
              </>
            ) : (
              t("practice.check")
            )
          }
          onAction={() => (outcome ? advance() : check())}
          disabled={!outcome && missing !== null}
          status={outcome ? null : missing}
          statusLive={false}
          toolbar={typed && question.kind !== "reverse" ? <SpecialCharBar compact disabled={outcome !== null} onInsert={insertChar} /> : null}
        />
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
