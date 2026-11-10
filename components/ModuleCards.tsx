"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuizStore } from "@/stores/quizStore";
import { useVerbStore } from "@/stores/verbStore";
import { useSentenceStore } from "@/stores/sentenceStore";
import { useGrammarStore } from "@/stores/grammarStore";
import { useNumbersStore } from "@/stores/numbersStore";
import { useDialogueStore } from "@/stores/dialogueStore";
import { useReadingStore } from "@/stores/readingStore";
import { numbersProgress } from "@/lib/numbersStats";
import { PASS_MARK } from "@/lib/scoreStats";
import { sentences } from "@/lib/sentences";
import ProgressRing from "./ProgressRing";

/** A streak of this many correct answers counts as 100% for the arcade and verb rings. */
const STREAK_GOAL = 10;

/** Number of completed (passed) items in a best-score map. */
const passedCount = (results: Readonly<Record<string, { best: number }>>): number =>
  Object.values(results).filter((r) => r.best >= PASS_MARK).length;

export default function ModuleCards({
  grammarTotal,
  dialogueTotal,
  readingTotal,
}: {
  grammarTotal: number;
  dialogueTotal: number;
  readingTotal: number;
}) {
  const t = useTranslations("Home");
  const [ready, setReady] = useState(false);

  const quizBest = useQuizStore((s) => s.bestStreak);
  const verbBest = useVerbStore((s) => s.bestStreak);
  const solved = useSentenceStore((s) => s.solvedIds.length);
  const grammarSolved = useGrammarStore((s) => Object.values(s.results).filter((r) => r.correct > 0).length);
  const numbersDone = useNumbersStore((s) => numbersProgress(s));
  const dialoguesPassed = useDialogueStore((s) => passedCount(s.results));
  const readingPassed = useReadingStore((s) => passedCount(s.results));

  // Persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      useQuizStore.persist.rehydrate(),
      useVerbStore.persist.rehydrate(),
      useSentenceStore.persist.rehydrate(),
      useGrammarStore.persist.rehydrate(),
      useNumbersStore.persist.rehydrate(),
      useDialogueStore.persist.rehydrate(),
      useReadingStore.persist.rehydrate(),
    ]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const modules: { key: string; href: string; value: number | null }[] = [
    { key: "arcade", href: "/arcade", value: quizBest / STREAK_GOAL },
    { key: "grammar", href: "/grammar", value: grammarTotal === 0 ? 0 : grammarSolved / grammarTotal },
    { key: "verbs", href: "/verbs", value: verbBest / STREAK_GOAL },
    { key: "vocabulary", href: "/vocabulary", value: null },
    { key: "numbers", href: "/numbers", value: numbersDone },
    { key: "sentences", href: "/sentences", value: solved / sentences.length },
    { key: "dialogues", href: "/dialogues", value: dialogueTotal === 0 ? 0 : dialoguesPassed / dialogueTotal },
    { key: "reading", href: "/reading", value: readingTotal === 0 ? 0 : readingPassed / readingTotal },
    { key: "listen", href: "/listen", value: null },
    { key: "review", href: "/review", value: null },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {modules.map((m) => {
        const value = m.value === null ? null : ready ? Math.min(1, m.value) : 0;
        return (
          <li key={m.key}>
            <Link
              href={m.href}
              className="card flex h-full items-center justify-between gap-3 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="min-w-0 space-y-0.5">
                <span className="block font-extrabold">{t(`modules.${m.key}.title`)}</span>
                <span className="block text-sm text-text-muted">{t(`modules.${m.key}.desc`)}</span>
              </span>
              {value !== null && (
                <ProgressRing value={value} size={44} label={t("progress", { percent: Math.round(value * 100) })} />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
