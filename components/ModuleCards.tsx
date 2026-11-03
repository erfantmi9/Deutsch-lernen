"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
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

// Below the fold: split into their own chunks and keep the layout stable while they load.
const placeholder = () => <div aria-hidden="true" className="aspect-[2/1] w-full" />;
const ArcadeHeader = dynamic(() => import("./illustrations/headers/ArcadeHeader"), { loading: placeholder });
const VerbsHeader = dynamic(() => import("./illustrations/headers/VerbsHeader"), { loading: placeholder });
const SentencesHeader = dynamic(() => import("./illustrations/headers/SentencesHeader"), { loading: placeholder });
const GrammarHeader = dynamic(() => import("./illustrations/headers/GrammarHeader"), { loading: placeholder });
const NumbersHeader = dynamic(() => import("./illustrations/headers/NumbersHeader"), { loading: placeholder });
const DialoguesHeader = dynamic(() => import("./illustrations/headers/DialoguesHeader"), { loading: placeholder });
const ReadingHeader = dynamic(() => import("./illustrations/headers/ReadingHeader"), { loading: placeholder });

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

  const modules = [
    { key: "grammar", href: "/grammar", art: <GrammarHeader size="100%" />, value: grammarTotal === 0 ? 0 : grammarSolved / grammarTotal },
    { key: "numbers", href: "/numbers", art: <NumbersHeader size="100%" />, value: numbersDone },
    { key: "dialogues", href: "/dialogues", art: <DialoguesHeader size="100%" />, value: dialogueTotal === 0 ? 0 : dialoguesPassed / dialogueTotal },
    { key: "reading", href: "/reading", art: <ReadingHeader size="100%" />, value: readingTotal === 0 ? 0 : readingPassed / readingTotal },
    { key: "arcade", href: "/arcade", art: <ArcadeHeader size="100%" />, value: quizBest / STREAK_GOAL },
    { key: "verbs", href: "/verbs", art: <VerbsHeader size="100%" />, value: verbBest / STREAK_GOAL },
    { key: "sentences", href: "/sentences", art: <SentencesHeader size="100%" />, value: solved / sentences.length },
  ] as const;

  return (
    <ul className="grid gap-5 sm:grid-cols-2">
      {modules.map((m) => {
        const value = ready ? Math.min(1, m.value) : 0;
        return (
          <li key={m.key}>
            <Link
              href={m.href}
              className="card group flex h-full flex-col gap-4 p-5 transition duration-150 hover:-translate-y-1 hover:shadow-lift"
            >
              <div className="rounded-2xl bg-surface-2 p-3 [&>svg]:h-auto [&>svg]:w-full">{m.art}</div>
              <div className="flex flex-1 items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold">{t(`modules.${m.key}.title`)}</h2>
                  <p className="text-sm text-text-muted">{t(`modules.${m.key}.desc`)}</p>
                </div>
                <ProgressRing value={value} label={t("progress", { percent: Math.round(value * 100) })} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
