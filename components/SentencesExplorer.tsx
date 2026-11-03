"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSentenceStore } from "@/stores/sentenceStore";
import { pickSentence } from "@/lib/sentenceBoard";
import { filterSentences, getAvailableFoci } from "@/lib/sentences";
import type { FocusFilter } from "@/lib/sentences";
import type { SentenceExercise } from "@/types/sentence";
import SentenceBuilder from "./SentenceBuilder";
import SentenceLesson from "./SentenceLesson";
import PageHeader from "./PageHeader";
import SentencesHeader from "./illustrations/headers/SentencesHeader";

export default function SentencesExplorer() {
  const t = useTranslations("Sentences");

  const focus = useSentenceStore((s) => s.focus);
  const setFocus = useSentenceStore((s) => s.setFocus);
  const solvedIds = useSentenceStore((s) => s.solvedIds);
  const streak = useSentenceStore((s) => s.streak);
  const bestStreak = useSentenceStore((s) => s.bestStreak);
  const recordResult = useSentenceStore((s) => s.recordResult);
  const reset = useSentenceStore((s) => s.reset);

  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState<SentenceExercise | null>(null);
  const [round, setRound] = useState(0);

  const foci = useMemo(() => getAvailableFoci(), []);
  const pool = useMemo(() => filterSentences(focus), [focus]);

  const pick = useCallback(
    (lastId: string | null) => {
      const { solvedIds: solved, wrongIds } = useSentenceStore.getState();
      setCurrent(pickSentence(pool, solved, wrongIds, lastId));
      setRound((r) => r + 1);
    },
    [pool],
  );

  // Hydration guard: persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useSentenceStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Choose an exercise when ready, and whenever the focus filter excludes the current one.
  useEffect(() => {
    if (!ready) return;
    if (!current || !pool.some((s) => s.id === current.id)) pick(null);
  }, [ready, pool, current, pick]);

  if (!ready || !current) {
    return (
      <div role="status" className="py-24 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  const solvedInPool = pool.filter((s) => solvedIds.includes(s.id)).length;
  const lessonFocus = focus === "all" ? current.grammarFocus : focus;

  const chip = (value: FocusFilter, label: string) => (
    <button key={value} type="button" aria-pressed={focus === value} onClick={() => setFocus(value)} className="pill">
      {label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} illustration={<SentencesHeader size="100%" />} />

      <div role="group" aria-label={t("filterByFocus")} className="flex flex-wrap gap-2">
        {chip("all", t("filterAll"))}
        {foci.map((f) => chip(f, t(`focus.${f}`)))}
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {(
          [
            [t("solved"), `${solvedInPool}/${pool.length}`],
            [t("streak"), streak],
            [t("best"), bestStreak],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="stat">
            <dt className="eyebrow">{label}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <SentenceLesson key={lessonFocus} focus={lessonFocus} />

      <SentenceBuilder
        key={`${current.id}-${round}`}
        exercise={current}
        onResult={(correct, first) => recordResult(current.id, correct, first)}
        onNext={() => pick(current.id)}
      />

      <div className="text-end">
        <button type="button" onClick={() => reset()} className="btn-ghost">
          {t("resetProgress")}
        </button>
      </div>
    </div>
  );
}
