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
import ConfirmDialog from "./ui/ConfirmDialog";
import ResponsiveSheet from "./ui/ResponsiveSheet";
import ScoreStrip from "./ui/ScoreStrip";

export default function SentencesExplorer() {
  const t = useTranslations("Sentences");

  const focus = useSentenceStore((s) => s.focus);
  const setFocus = useSentenceStore((s) => s.setFocus);
  const solvedIds = useSentenceStore((s) => s.solvedIds);
  const streak = useSentenceStore((s) => s.streak);
  const bestStreak = useSentenceStore((s) => s.bestStreak);
  const markLessonSeen = useSentenceStore((s) => s.markLessonSeen);
  const recordResult = useSentenceStore((s) => s.recordResult);
  const reset = useSentenceStore((s) => s.reset);

  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState<SentenceExercise | null>(null);
  const [round, setRound] = useState(0);
  const [focusOpen, setFocusOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);

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

  const lessonFocus = current ? (focus === "all" ? current.grammarFocus : focus) : null;

  // The mini lesson starts expanded the first time a focus is shown and collapsed on every later visit. Decided from
  // the stored flag at that moment (then the flag is set), so it does not collapse by itself right after opening.
  useEffect(() => {
    if (!ready || !lessonFocus) return;
    setLessonOpen(!useSentenceStore.getState().lessonSeen.includes(lessonFocus));
    markLessonSeen(lessonFocus);
  }, [ready, lessonFocus, markLessonSeen]);

  if (!ready || !current || !lessonFocus) {
    return (
      <div role="status" className="py-24 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  const solvedInPool = pool.filter((s) => solvedIds.includes(s.id)).length;
  const focusLabel = focus === "all" ? t("filterAll") : t(`focus.${focus}`);

  const chip = (value: FocusFilter, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={focus === value}
      onClick={() => {
        setFocus(value);
        setFocusOpen(false);
      }}
      className="pill"
    >
      {label}
    </button>
  );

  const actions = (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setFocusOpen(true)} aria-haspopup="dialog" aria-label={`${t("filterByFocus")}: ${focusLabel}`} title={t("filterByFocus")} className="pill max-w-[11rem] gap-1.5">
        <span className="truncate">{focusLabel}</span>
        <span className="shrink-0 text-xs tabular-nums">
          {solvedInPool}/{pool.length}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs">
          ▾
        </span>
      </button>
      <button
        type="button"
        aria-expanded={lessonOpen}
        aria-controls="sentence-lesson"
        aria-label={lessonOpen ? t("lessonClose") : t("lessonOpen")}
        title={lessonOpen ? t("lessonClose") : t("lessonOpen")}
        onClick={() => setLessonOpen(!lessonOpen)}
        className="pill size-11 shrink-0 justify-center !px-0 text-lg"
      >
        <span aria-hidden="true">📖</span>
      </button>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 short:space-y-2 sm:space-y-4">
      <PageHeader compact title={t("title")} subtitle={t("subtitle")} illustration={<SentencesHeader size="100%" />} actions={actions} />

      <div className="hidden sm:block short:hidden">
        <ScoreStrip
          items={[
            [t("solved"), `${solvedInPool}/${pool.length}`],
            [t("streak"), streak],
            [t("best"), bestStreak],
          ]}
        />
      </div>

      <div id="sentence-lesson" hidden={!lessonOpen}>
        {lessonOpen && <SentenceLesson key={lessonFocus} focus={lessonFocus} />}
      </div>

      <SentenceBuilder
        key={`${current.id}-${round}`}
        exercise={current}
        onResult={(correct, first) => recordResult(current.id, correct, first)}
        onNext={() => pick(current.id)}
      />

      <ResponsiveSheet
        open={focusOpen}
        onClose={() => setFocusOpen(false)}
        title={t("filterByFocus")}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-text-muted">
              {t("streak")} {streak} · {t("best")} {bestStreak}
            </span>
            <button
              type="button"
              onClick={() => {
                setFocusOpen(false);
                setConfirmReset(true);
              }}
              className="btn-ghost"
            >
              {t("resetProgress")}
            </button>
          </div>
        }
      >
        <div role="group" aria-label={t("filterByFocus")} className="flex flex-wrap gap-2">
          {chip("all", t("filterAll"))}
          {foci.map((f) => chip(f, t(`focus.${f}`)))}
        </div>
      </ResponsiveSheet>

      <ConfirmDialog
        open={confirmReset}
        title={t("resetConfirmTitle")}
        message={t("resetConfirmBody")}
        confirmLabel={t("resetProgress")}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
      />
    </div>
  );
}
