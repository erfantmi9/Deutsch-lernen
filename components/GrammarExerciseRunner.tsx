"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
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
        {filled ?? " "}
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
  const inputRef = useRef<HTMLInputElement>(null);

  const startSession = useCallback(() => {
    const { results: r, wrongIds } = useGrammarStore.getState();
    setQueue(buildPracticeQueue(exercises, { results: r, wrongIds }));
    setIndex(0);
    setSessionCorrect(0);
    setInput("");
    setResult(null);
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

  const exercise = queue[index] ?? null;
  const typed = exercise !== null && exercise.type !== "choice";

  // Focus the text field for every new typed question.
  useEffect(() => {
    if (typed && !result) inputRef.current?.focus();
  }, [typed, result, index]);

  const answer = (value: string) => {
    if (!exercise || result) return;
    const check = checkGrammarAnswer(exercise, value);
    const correct = check === "correct";
    setResult({ check, correct, given: value });
    if (correct) setSessionCorrect((n) => n + 1);
    recordResult(lessonId, exercise.id, correct, exerciseIds);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim().length > 0) answer(input);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setInput("");
    setResult(null);
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

  if (!ready) {
    return (
      <div role="status" className="py-12 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  // ---- summary ----
  if (!exercise) {
    const total = queue.length;
    const good = total > 0 && sessionCorrect / total >= 0.8;
    const progress = lessonProgress(exerciseIds, results);
    return (
      <div className="card-hero space-y-4 p-6 text-center" role="status">
        <Mascot mood={good ? "cheering" : "thinking"} size={110} className="mx-auto" />
        <h3 className="text-2xl font-extrabold">{t("summaryTitle")}</h3>
        <p className="text-lg">{t("summaryScore", { correct: sessionCorrect, total })}</p>
        <p className="text-sm text-text-muted">{t("exercisesSolved", { solved: progress.solved, total: progress.total })}</p>
        {completed && <p className="feedback-success mx-auto max-w-sm font-bold">✓ {t("lessonCompleted")}</p>}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button type="button" onClick={startSession} className="btn btn-primary">
            {t("practiceAgain")}
          </button>
          <Link href="/grammar" className="btn btn-secondary">
            {t("backToGrammar")}
          </Link>
        </div>
      </div>
    );
  }

  const isLast = index === queue.length - 1;
  const tone = result ? (result.correct ? "success" : "danger") : null;

  return (
    <section aria-label={t("practiceTitle")} className="space-y-4">
      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            [t("question"), `${index + 1} / ${queue.length}`],
            [t("streak"), String(streak)],
            [t("best"), String(bestStreak)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="stat">
            <dt className="eyebrow">{label}</dt>
            <dd className="text-xl font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="card-hero space-y-3 p-6">
          <p className="eyebrow">{t(`types.${exercise.type}`)}</p>
          <p className="font-bold">{exercise.prompt[locale]}</p>
          <GapSentence
            sentence={exercise.sentenceDe}
            filled={result ? exercise.answer : null}
            tone={tone}
          />
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

        {typed && (
          <>
            <div>
              <label htmlFor={inputId} className="mb-1 block text-sm font-bold text-text-muted">
                {t("typeAnswer")}
              </label>
              <input
                id={inputId}
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={result !== null}
                dir="ltr"
                lang="de"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                className="w-full rounded-full border-2 border-border bg-surface px-6 py-3 text-xl text-text shadow-soft outline-none placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-60"
              />
            </div>
            <SpecialCharBar disabled={result !== null} onInsert={insertChar} />
            {!result && (
              <button type="submit" disabled={input.trim().length === 0} className="btn btn-primary w-full py-3 text-lg">
                {t("check")}
              </button>
            )}
          </>
        )}
      </form>

      {/* Feedback */}
      <div aria-live="polite" role="status" className="min-h-[5rem]">
        {result && (
          <div className={"space-y-3 " + (result.correct ? "feedback-success" : "feedback-error")}>
            <div className="flex items-center gap-4">
              <Mascot
                mood={result.correct ? "cheering" : "sad"}
                size={80}
                className={"shrink-0 " + (result.correct ? "motion-safe:animate-bounce-soft" : "")}
              />
              <div className="space-y-1">
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
            <button type="button" onClick={next} autoFocus className="btn btn-primary">
              {isLast ? t("finish") : t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
