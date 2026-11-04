"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useGrammarStore } from "@/stores/grammarStore";
import { buildPracticeQueue, checkGrammarAnswer, lessonProgress } from "@/lib/grammarLogic";
import type { GrammarCheck } from "@/lib/grammarLogic";
import { fillGap, splitAtGap } from "@/lib/grammarText";
import type { Locale } from "@/lib/grammarText";
import type { GrammarExercise } from "@/types/grammar";
import Mascot from "./illustrations/Mascot";
import SpecialCharBar from "./SpecialCharBar";
import FeedbackRegion from "./ui/FeedbackRegion";
import ScoreStrip from "./ui/ScoreStrip";
import StickyActionBar from "./ui/StickyActionBar";
import { useKeyboardInset } from "./ui/useKeyboardInset";
import { useScrollIntoViewOnChange } from "./ui/useScrollIntoViewOnChange";

interface Result {
  check: GrammarCheck;
  correct: boolean;
  given: string;
}

/** The exercise sentence with a visible gap that is filled in after answering. */
function GapSentence({ sentence, filled, tone }: { sentence: string; filled: string | null; tone: "success" | "danger" | null }) {
  const { before, after } = splitAtGap(sentence);
  return (
    <p dir="ltr" lang="de" className="text-2xl font-extrabold leading-relaxed sm:text-3xl">
      {before}
      <span
        className={
          "mx-1 inline-block min-w-[4.5rem] border-b-4 px-2 text-center " +
          (tone === "success" ? "border-success text-success" : tone === "danger" ? "border-danger text-danger" : "border-primary text-primary")
        }
      >
        {filled ?? " "}
      </span>
      {after}
    </p>
  );
}

export default function GrammarExerciseRunner({
  lessonId,
  exercises,
}: {
  lessonId: string;
  exercises: readonly GrammarExercise[];
}) {
  const t = useTranslations("Grammar");
  const locale = useLocale() as Locale;
  const inputId = useId();

  const streak = useGrammarStore((s) => s.streak);
  const bestStreak = useGrammarStore((s) => s.bestStreak);
  const results = useGrammarStore((s) => s.results);
  const completed = useGrammarStore((s) => s.completedLessonIds.includes(lessonId));
  const recordResult = useGrammarStore((s) => s.recordResult);

  const exerciseIds = exercises.map((e) => e.id);

  const [ready, setReady] = useState(false);
  const [queue, setQueue] = useState<GrammarExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [inView, setInView] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Synchronous "this question is answered" flag: a same-tick double click / double Enter can neither record two
  // answers nor skip an unanswered question (state updates are async, a ref is not).
  const answeredRef = useRef(false);
  const engaged = useRef(false);
  const keyboard = useKeyboardInset();

  const startSession = useCallback(() => {
    const { results: r, wrongIds } = useGrammarStore.getState();
    setQueue(buildPracticeQueue(exercises, { results: r, wrongIds }));
    setIndex(0);
    setSessionCorrect(0);
    setInput("");
    setResult(null);
    answeredRef.current = false;
  }, [exercises]);

  // Persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useGrammarStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      startSession();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [startSession]);

  // The practice block sits at the end of a long lesson page. The action bar (which replaces the mobile bottom nav)
  // is only shown while the block is on screen, so reading the lesson keeps normal navigation.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const exercise = queue[index] ?? null;
  const summary = ready && !exercise;
  const typed = exercise !== null && exercise.type !== "choice";

  // Focus the text field for every new typed question, but only once the learner has started answering: focusing on
  // page load would scroll a long lesson straight to the practice block (and pop the keyboard just from scrolling).
  useEffect(() => {
    if (typed && !result && engaged.current) inputRef.current?.focus({ preventScroll: true });
  }, [typed, result, index]);

  // After a choice answer the pressed button is disabled and loses focus: park focus on the persistent action button.
  // (Typed answers keep focus in the read-only input, so the keyboard stays open and Enter goes on.)
  useEffect(() => {
    if (result && !typed) actionRef.current?.focus({ preventScroll: true });
  }, [result, typed]);

  // Feedback appears under the question; bring it fully into view above the bar.
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(result, { enabled: result !== null, focus: false, block: "nearest" });

  // End of session: scroll the summary card to the top of the screen and focus its heading.
  const summaryRef = useScrollIntoViewOnChange<HTMLDivElement>(summary, { enabled: summary, focus: false, block: "start" });
  useEffect(() => {
    if (summary) headingRef.current?.focus({ preventScroll: true });
  }, [summary]);

  // Keyboard open on a typed question: make sure the field is not hidden between the header and the bar.
  useEffect(() => {
    // .scroll-target margins include --keyboard-inset and the bar height, so "nearest" lands above both.
    if (keyboard > 0 && typed) fieldRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [keyboard, typed]);

  const answer = (value: string) => {
    if (!exercise || answeredRef.current) return;
    answeredRef.current = true;
    engaged.current = true;
    const check = checkGrammarAnswer(exercise, value);
    const correct = check === "correct";
    setResult({ check, correct, given: value });
    if (correct) setSessionCorrect((n) => n + 1);
    recordResult(lessonId, exercise.id, correct, exerciseIds);
  };

  const next = () => {
    if (!answeredRef.current) return; // nothing answered yet: Next is inert
    answeredRef.current = false;
    setIndex((i) => i + 1);
    setInput("");
    setResult(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (result) next();
    else if (input.trim().length > 0) answer(input);
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

  // One stable wrapper for every state, so the IntersectionObserver keeps watching the same node.
  const wrap = (body: ReactNode) => <div ref={wrapRef}>{body}</div>;

  if (!ready) {
    return wrap(
      <div role="status" className="py-12 text-center text-text-muted">
        {t("loading")}
      </div>,
    );
  }

  // ---- summary ----
  if (!exercise) {
    const total = queue.length;
    const good = total > 0 && sessionCorrect / total >= 0.8;
    const progress = lessonProgress(exerciseIds, results);
    return wrap(
      <>
        <div ref={summaryRef} className="card-hero space-y-4 p-6 text-center">
          <Mascot mood={good ? "cheering" : "thinking"} size={110} className="mx-auto" />
          <h3 ref={headingRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("summaryTitle")}
          </h3>
          <p className="text-lg">{t("summaryScore", { correct: sessionCorrect, total })}</p>
          <p className="text-sm text-text-muted">{t("exercisesSolved", { solved: progress.solved, total: progress.total })}</p>
          {completed && <p className="feedback-success mx-auto max-w-sm font-bold">✓ {t("lessonCompleted")}</p>}
        </div>
        {inView && (
          <StickyActionBar
            ref={actionRef}
            label={t("practiceAgain")}
            onAction={() => {
              engaged.current = true;
              startSession();
            }}
            secondary={
              <Link href="/grammar" className="btn btn-secondary shrink-0">
                {t("backToGrammar")}
              </Link>
            }
          />
        )}
      </>,
    );
  }

  const isLast = index === queue.length - 1;
  const tone = result ? (result.correct ? "success" : "danger") : null;
  const canSubmit = input.trim().length > 0;
  const charBar = typed ? <SpecialCharBar disabled={result !== null} onInsert={insertChar} /> : null;
  const advanceLabel = (
    <>
      {isLast ? t("finish") : t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
    </>
  );

  return wrap(
    <>
      <section aria-label={t("practiceTitle")} className="space-y-4">
        <ScoreStrip
          items={[
            [t("question"), `${index + 1} / ${queue.length}`],
            [t("streak"), streak],
            [t("best"), bestStreak],
          ]}
        />

        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <div className="card-hero space-y-3 p-4 sm:p-6">
            <p className="eyebrow">{t(`types.${exercise.type}`)}</p>
            <p className="font-bold">{exercise.prompt[locale]}</p>
            <GapSentence sentence={exercise.sentenceDe} filled={result ? exercise.answer : null} tone={tone} />
          </div>

          {exercise.type === "choice" && exercise.options && (
            <div role="group" aria-label={t("chooseAnswer")} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {exercise.options.map((opt) => {
                const isAnswer = result !== null && checkGrammarAnswer(exercise, opt) === "correct";
                const isWrongPick = result !== null && !result.correct && opt === result.given;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={result !== null}
                    onClick={() => answer(opt)}
                    className={
                      "pill relative min-h-14 justify-center text-lg text-text disabled:cursor-default " +
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
                    {/* Absolute so the marker never changes the button's height or wraps the label. */}
                    {(isAnswer || isWrongPick) && (
                      <span aria-hidden="true" className="absolute end-3 top-1/2 -translate-y-1/2">
                        {isAnswer ? "✓" : "✗"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {typed && (
            <div ref={fieldRef} className="scroll-target">
              <label htmlFor={inputId} className="mb-1 block text-sm font-bold text-text-muted">
                {t("typeAnswer")}
              </label>
              <input
                id={inputId}
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                // readOnly (not disabled) once answered: focus and the on-screen keyboard stay, Enter goes to Next.
                readOnly={result !== null}
                aria-readonly={result !== null}
                dir="ltr"
                lang="de"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint={result ? "next" : "done"}
                className="w-full rounded-full border-2 border-border bg-surface px-6 py-3 text-xl text-text shadow-soft outline-none placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 read-only:bg-surface-2"
              />
            </div>
          )}

          {/* ä ö ü ß: inline normally; while the keyboard is open they move into the action bar, above the keyboard. */}
          {keyboard === 0 && charBar}
        </form>

        {/* Feedback: directly under the question, live region always mounted, ~11rem reserved (result + sentence + explanation). */}
        <FeedbackRegion size="lg" ref={feedbackRef}>
          {result && (
            <div className={"space-y-2 " + (result.correct ? "feedback-success" : "feedback-error")}>
              <div className="flex items-center gap-3">
                <Mascot
                  mood={result.correct ? "cheering" : "sad"}
                  size={48}
                  className={"shrink-0 " + (result.correct ? "motion-safe:animate-bounce-soft" : "")}
                />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-bold">{result.correct ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}</p>
                  <p>
                    <bdi dir="ltr" lang="de" className="font-extrabold text-text">
                      {fillGap(exercise.sentenceDe, exercise.answer)}
                    </bdi>
                  </p>
                </div>
              </div>
              {result.check === "umlaut" && <p className="feedback-hint">⚠ {t("umlautHint")}</p>}
              <p className="text-sm text-text">{exercise.explanation[locale]}</p>
            </div>
          )}
        </FeedbackRegion>

        {inView && (
          <StickyActionBar
            ref={actionRef}
            label={result || !typed ? advanceLabel : t("check")}
            disabled={result ? false : typed ? !canSubmit : true}
            onAction={() => (result ? next() : answer(input))}
            status={result ? null : typed ? (canSubmit ? null : t("missingAnswer")) : t("missingChoice")}
            toolbar={keyboard > 0 ? charBar : null}
          />
        )}
      </section>
    </>,
  );
}
