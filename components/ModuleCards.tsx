"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useQuizStore } from "@/stores/quizStore";
import { useVerbStore } from "@/stores/verbStore";
import { useSentenceStore } from "@/stores/sentenceStore";
import { sentences } from "@/lib/sentences";
import ProgressRing from "./ProgressRing";

// Below the fold: split into their own chunks and keep the layout stable while they load.
const placeholder = () => <div aria-hidden="true" className="aspect-[2/1] w-full" />;
const ArcadeHeader = dynamic(() => import("./illustrations/headers/ArcadeHeader"), { loading: placeholder });
const VerbsHeader = dynamic(() => import("./illustrations/headers/VerbsHeader"), { loading: placeholder });
const SentencesHeader = dynamic(() => import("./illustrations/headers/SentencesHeader"), { loading: placeholder });

/** A streak of this many correct answers counts as 100% for the arcade and verb rings. */
const STREAK_GOAL = 10;

export default function ModuleCards() {
  const t = useTranslations("Home");
  const [ready, setReady] = useState(false);

  const quizBest = useQuizStore((s) => s.bestStreak);
  const verbBest = useVerbStore((s) => s.bestStreak);
  const solved = useSentenceStore((s) => s.solvedIds.length);

  // Persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      useQuizStore.persist.rehydrate(),
      useVerbStore.persist.rehydrate(),
      useSentenceStore.persist.rehydrate(),
    ]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const modules = [
    { key: "arcade", href: "/arcade", art: <ArcadeHeader size="100%" />, value: quizBest / STREAK_GOAL },
    { key: "verbs", href: "/verbs", art: <VerbsHeader size="100%" />, value: verbBest / STREAK_GOAL },
    { key: "sentences", href: "/sentences", art: <SentencesHeader size="100%" />, value: solved / sentences.length },
  ] as const;

  return (
    <ul className="grid gap-5 sm:grid-cols-3">
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
