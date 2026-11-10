"use client";

import { useEffect, useState } from "react";
import { evaluatePath, resumeSection } from "@/lib/learningPath";
import { dateKey } from "@/lib/dateKey";
import { numbersProgress } from "@/lib/numbersStats";
import { PASS_MARK } from "@/lib/scoreStats";
import { buildQueue } from "@/lib/srs";
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

const passedCount = (results: Readonly<Record<string, { best: number }>>): number =>
  Object.values(results).filter((r) => r.best >= PASS_MARK).length;

let hydration: Promise<void> | null = null;

/** Loads every store the home page reads, once per page load. */
function ensureHomeHydrated(): Promise<void> {
  hydration ??= Promise.all([
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
  ]).then(() => undefined);
  return hydration;
}

/**
 * Everything the home page shows from saved progress. `ready` is false until the stores have loaded on the client:
 * render a same-size skeleton (aria-busy) until then, never default text that is swapped a moment later.
 */
export function useHomeProgress() {
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("1970-01-01");

  const quizBest = useQuizStore((s) => s.bestStreak);
  const verbScore = useVerbStore((s) => s.score);
  const completed = useGrammarStore((s) => s.completedLessonIds);
  const numbers = useNumbersStore((s) => numbersProgress(s));
  const dialogues = useDialogueStore((s) => passedCount(s.results));
  const reading = useReadingStore((s) => passedCount(s.results));
  const solved = useSentenceStore((s) => s.solvedIds.length);
  const srsCards = useSrsStore((s) => s.cards);
  const reviewLog = useSrsStore((s) => s.log);
  const newPerDay = useSrsStore((s) => s.newPerDay);
  const attempts = useExamStore((s) => s.attempts.length);
  const days = useActivityStore((s) => s.days);
  const lastVisit = useLearnStore((s) => s.lastVisit);
  const goal = useLearnStore((s) => s.dailyGoal);

  useEffect(() => {
    let cancelled = false;
    void ensureHomeHydrated().then(() => {
      if (cancelled) return;
      setToday(dateKey());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const deckSize = Object.keys(srsCards).length;
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
  const due = buildQueue(srsCards, { today, newPerDay, newDoneToday: reviewLog[today]?.newCards ?? 0 }).ids.length;
  const section = lastVisit ? resumeSection(lastVisit) : null;
  const hasActivity = Object.values(days).some((n) => n > 0);

  return {
    ready,
    steps,
    /** The first step not done yet (the last step once everything is done). */
    nextStep: steps.find((s) => s.current) ?? steps[steps.length - 1],
    deckSize,
    due,
    todayCount: days[today] ?? 0,
    goal,
    resume: lastVisit && section ? { href: lastVisit, section } : null,
    /** Nothing saved yet: no step done, no review cards, no answers, no visited section. */
    isNew: !steps.some((s) => s.done) && deckSize === 0 && !hasActivity && !section,
    /** Answers given on any day so far, including today. */
    hasActivity,
    streakDays: days,
  };
}
