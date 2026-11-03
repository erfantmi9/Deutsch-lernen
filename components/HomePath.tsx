"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { evaluatePath, GOAL_CHOICES, goalFraction, resumeSection } from "@/lib/learningPath";
import { dateKey } from "@/lib/dateKey";
import { numbersProgress } from "@/lib/numbersStats";
import { PASS_MARK } from "@/lib/scoreStats";
import { useActivityStore } from "@/stores/activityStore";
import { useDialogueStore } from "@/stores/dialogueStore";
import { useExamStore } from "@/stores/examStore";
import { useGrammarStore } from "@/stores/grammarStore";
import { ensureLearnHydrated, useLearnStore } from "@/stores/learnStore";
import { useNumbersStore } from "@/stores/numbersStore";
import { useQuizStore } from "@/stores/quizStore";
import { useReadingStore } from "@/stores/readingStore";
import { useSentenceStore } from "@/stores/sentenceStore";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";
import { useVerbStore } from "@/stores/verbStore";
import ProgressRing from "./ProgressRing";

const passedCount = (results: Readonly<Record<string, { best: number }>>): number =>
  Object.values(results).filter((r) => r.best >= PASS_MARK).length;

/** Home page: daily goal, "continue where you left off", and the recommended path through the course. */
export default function HomePath() {
  const t = useTranslations("Path");
  const tNav = useTranslations("Nav");
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("1970-01-01");

  const quizBest = useQuizStore((s) => s.bestStreak);
  const verbScore = useVerbStore((s) => s.score);
  const completed = useGrammarStore((s) => s.completedLessonIds);
  const numbers = useNumbersStore((s) => numbersProgress(s));
  const dialogues = useDialogueStore((s) => passedCount(s.results));
  const reading = useReadingStore((s) => passedCount(s.results));
  const solved = useSentenceStore((s) => s.solvedIds.length);
  const deckSize = useSrsStore((s) => Object.keys(s.cards).length);
  const reviewLog = useSrsStore((s) => s.log);
  const attempts = useExamStore((s) => s.attempts.length);
  const days = useActivityStore((s) => s.days);
  const lastVisit = useLearnStore((s) => s.lastVisit);
  const goal = useLearnStore((s) => s.dailyGoal);
  const setGoal = useLearnStore((s) => s.setDailyGoal);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      useQuizStore.persist.rehydrate(),
      useVerbStore.persist.rehydrate(),
      useGrammarStore.persist.rehydrate(),
      useNumbersStore.persist.rehydrate(),
      useDialogueStore.persist.rehydrate(),
      useReadingStore.persist.rehydrate(),
      useSentenceStore.persist.rehydrate(),
      useExamStore.persist.rehydrate(),
      useActivityStore.persist.rehydrate(),
      ensureSrsHydrated(),
      ensureLearnHydrated(),
    ]).then(() => {
      if (cancelled) return;
      setToday(dateKey());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = evaluatePath({
    quizBestStreak: quizBest,
    verbScore,
    completedLessonIds: completed,
    numbersProgress: numbers,
    dialoguesPassed: dialogues,
    readingPassed: reading,
    sentencesSolved: solved,
    reviewDeckSize: deckSize,
    reviewAnswers: Object.values(reviewLog).reduce((n, d) => n + d.reviews, 0),
    examAttempts: attempts,
  });
  const doneCount = steps.filter((s) => s.done).length;
  const todayCount = ready ? (days[today] ?? 0) : 0;
  const fraction = goalFraction(todayCount, goal);
  const section = lastVisit ? resumeSection(lastVisit) : null;

  return (
    <section aria-labelledby="path-title" className="space-y-5">
      <h2 id="path-title" className="text-2xl font-extrabold">
        {t("title")}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card flex items-center gap-4 p-5">
          <ProgressRing value={ready ? fraction : 0} size={84} label={t("goalRing", { percent: Math.round((ready ? fraction : 0) * 100) })} />
          <div className="space-y-2">
            <p className="font-extrabold">{t("goalTitle")}</p>
            <p className="text-sm text-text-muted" aria-live="polite">
              {fraction >= 1 ? t("goalDone") : t("goalProgress", { done: todayCount, goal })}
            </p>
            <div role="group" aria-label={t("goalChoose")} className="flex flex-wrap gap-2">
              {GOAL_CHOICES.map((g) => (
                <button key={g} type="button" aria-pressed={ready && goal === g} onClick={() => setGoal(g)} className="pill min-h-11 px-3">
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card flex flex-col justify-center gap-2 p-5">
          <p className="font-extrabold">{t("continueTitle")}</p>
          {ready && lastVisit && section ? (
            <>
              <p className="text-sm text-text-muted">{t("continueText", { section: tNav(section) })}</p>
              <Link href={lastVisit} className="btn btn-primary self-start">
                {t("continueButton")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-text-muted">{t("continueEmpty")}</p>
              <Link href="/arcade" className="btn btn-primary self-start">
                {t("startButton")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-extrabold">{t("pathTitle")}</h3>
          <p className="text-sm font-bold text-text-muted">{t("pathCount", { done: ready ? doneCount : 0, total: steps.length })}</p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {steps.map((s, i) => {
            const done = ready && s.done;
            const current = ready && s.current;
            return (
              <li key={s.id}>
                <Link
                  href={s.href}
                  aria-current={current ? "step" : undefined}
                  className={
                    "flex min-h-14 items-center gap-3 rounded-2xl border p-3 transition hover:bg-surface-2 " +
                    (current ? "border-primary bg-primary-soft" : "border-border")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold " +
                      (done ? "bg-success text-on-primary" : current ? "bg-primary text-on-primary" : "bg-surface-2 text-text-muted")
                    }
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-extrabold">{t(`steps.${s.id}.title`)}</span>
                    <span className="block text-xs text-text-muted">{t(`steps.${s.id}.desc`)}</span>
                  </span>
                  <span className="ms-auto text-xs font-extrabold">
                    {done ? t("stateDone") : current ? t("stateNext") : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
