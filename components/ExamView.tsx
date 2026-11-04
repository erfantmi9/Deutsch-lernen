"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { bestTotal, isComplete, isPassing, MAX_TOTAL, PASS_POINTS, totalPoints } from "@/lib/exam";
import { useExamStore } from "@/stores/examStore";
import { EXAM_MODULES, MODULE_MINUTES, POINTS_PER_MODULE } from "@/types/exam";
import type { ExamData, ExamModule } from "@/types/exam";
import type { ReadingText } from "@/types/reading";
import { HoerenPart, LesenPart, SchreibenPart, SprechenPart } from "./ExamParts";
import type { PartResult } from "./ExamParts";
import PageHeader from "./PageHeader";
import Mascot from "./illustrations/Mascot";
import ConfirmDialog from "./ui/ConfirmDialog";

type Locale = "en" | "fa" | "de";

export default function ExamView({ data, texts }: { data: ExamData; texts: ReadingText[] }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);
  // `plan` is the queue of parts still to do; `current` is the part on screen.
  const [plan, setPlan] = useState<ExamModule[]>([]);
  const [current, setCurrent] = useState<ExamModule | null>(null);
  const [results, setResults] = useState<Partial<Record<ExamModule, PartResult>>>({});
  const [fullRun, setFullRun] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // A part (or the full run) the learner asked for; its timer only starts once they confirm.
  const [pending, setPending] = useState<{ modules: ExamModule[]; full: boolean } | null>(null);

  const attempts = useExamStore((s) => s.attempts);
  const recordAttempt = useExamStore((s) => s.recordAttempt);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(useExamStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const recorded = useRef(false);

  const begin = (modules: ExamModule[], full: boolean) => {
    recorded.current = false;
    setResults({});
    setShowResult(false);
    setFullRun(full);
    setCurrent(modules[0]);
    setPlan(modules.slice(1));
  };

  const finishPart = useCallback(
    (r: PartResult) => {
      setResults((prev) => {
        if (prev[r.module]) return prev; // handed in twice (button and timer at the same moment)
        return { ...prev, [r.module]: r };
      });
      setCurrent(null);
      if (plan.length === 0) {
        setShowResult(true);
      }
    },
    [plan.length],
  );

  const continueExam = () => {
    setCurrent(plan[0] ?? null);
    setPlan((p) => p.slice(1));
  };

  // Focus management: every screen change moves focus to that screen's heading and scrolls to the top, so a keyboard or
  // screen-reader user lands at the start of the new content instead of on a button that no longer exists.
  const phase = current ? `part-${current}` : fullRun && !showResult && plan.length > 0 && Object.keys(results).length > 0 ? `between-${plan.length}` : showResult ? "result" : "start";
  const lastPhase = useRef(phase);
  useEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    window.scrollTo(0, 0);
    const target = document.getElementById("exam-focus") ?? document.querySelector<HTMLElement>("main h1");
    if (target) {
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }, [phase]);

  const scores = Object.fromEntries(EXAM_MODULES.filter((m) => results[m]).map((m) => [m, results[m]!.points]));
  const total = totalPoints(scores);
  const complete = isComplete(scores);

  // A finished four-part run is stored once (an effect, so it cannot run twice inside a state updater).
  useEffect(() => {
    if (fullRun && complete && !recorded.current) {
      recorded.current = true;
      recordAttempt(Object.fromEntries(EXAM_MODULES.map((m) => [m, results[m]!.points])) as Record<ExamModule, number>);
    }
  });

  // ---------- a part is running ----------
  if (current) {
    const seconds = MODULE_MINUTES[current] * 60;
    return (
      <div className="mx-auto max-w-2xl">
        {current === "lesen" && <LesenPart key="lesen" texts={texts} seconds={seconds} onDone={finishPart} />}
        {current === "hoeren" && <HoerenPart key="hoeren" items={data.hoeren} seconds={seconds} onDone={finishPart} />}
        {current === "schreiben" && <SchreibenPart key="schreiben" data={data.schreiben} seconds={seconds} onDone={finishPart} />}
        {current === "sprechen" && <SprechenPart key="sprechen" parts={data.sprechen} seconds={seconds} onDone={finishPart} />}
      </div>
    );
  }

  // ---------- between parts of a full run ----------
  if (fullRun && !showResult && plan.length > 0 && Object.keys(results).length > 0) {
    const last = EXAM_MODULES.filter((m) => results[m]).at(-1)!;
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <section className="card-hero space-y-4 p-6 text-center">
          <Mascot mood="cheering" size={100} className="mx-auto" />
          <h2 id="exam-focus" tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("partDone", { part: t(`modules.${last}`) })}
          </h2>
          <p>{t("nextPart", { part: t(`modules.${plan[0]}`), minutes: MODULE_MINUTES[plan[0]] })}</p>
          <button type="button" className="btn btn-primary" onClick={continueExam}>
            {t("continue")}
          </button>
        </section>
      </div>
    );
  }

  // ---------- result ----------
  if (showResult && Object.keys(results).length > 0) {
    const passed = isPassing(total);
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <section className="card-hero space-y-4 p-6 text-center">
          <Mascot mood={complete ? (passed ? "cheering" : "thinking") : "waving"} size={110} className="mx-auto" />
          <h1 id="exam-focus" tabIndex={-1} className="text-3xl font-extrabold outline-none">
            {t("resultTitle")}
          </h1>
          {complete ? (
            <>
              <p className="text-4xl font-extrabold text-primary tabular-nums">{t("total", { total, max: MAX_TOTAL })}</p>
              <p className="font-bold">{passed ? t("passed", { pass: PASS_POINTS }) : t("notPassed", { pass: PASS_POINTS })}</p>
            </>
          ) : (
            <p className="text-text-muted">{t("partOnly")}</p>
          )}
          <ul className="space-y-3 text-start">
            {EXAM_MODULES.filter((m) => results[m]).map((m) => {
              const r = results[m]!;
              return (
                <li key={m} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-extrabold">{t(`modules.${m}`)}</span>
                    <span className="tabular-nums">{t("points", { points: r.points, max: POINTS_PER_MODULE })}</span>
                  </div>
                  <progress value={r.points} max={POINTS_PER_MODULE} aria-label={t(`modules.${m}`)} className="h-2 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-2 [&::-webkit-progress-value]:bg-primary" />
                  <p className="text-sm text-text-muted">{t(`kind.${m}`, { got: r.got, total: r.total })}</p>
                </li>
              );
            })}
          </ul>
          <p className="feedback-hint">{t("disclaimer")}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowResult(false);
              setResults({});
              setFullRun(false);
            }}
          >
            {t("backToStart")}
          </button>
        </section>
      </div>
    );
  }

  // ---------- start screen ----------
  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} illustration={<Mascot mood="thinking" size={120} className="mx-auto" />} />
      <p role="note" className="feedback-hint">
        {t("disclaimer")}
      </p>

      <section aria-labelledby="exam-parts" className="card space-y-4 p-5 sm:p-6">
        <h2 id="exam-parts" className="text-xl font-extrabold">
          {t("partsTitle")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXAM_MODULES.map((m) => (
            <li key={m} className="space-y-2 rounded-3xl border border-border bg-surface-2 p-4">
              <p className="font-extrabold">{t(`modules.${m}`)}</p>
              <p className="text-sm text-text-muted">{t(`about.${m}`, { minutes: MODULE_MINUTES[m] })}</p>
              <button type="button" className="pill" onClick={() => setPending({ modules: [m], full: false })}>
                {t("practicePart")}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary w-full py-3 text-lg" onClick={() => setPending({ modules: [...EXAM_MODULES], full: true })}>
          {t("startFull")}
        </button>
        <p className="text-sm text-text-muted">{t("fullHint", { max: MAX_TOTAL, pass: PASS_POINTS })}</p>
      </section>

      <ConfirmDialog
        open={pending !== null}
        title={t("startConfirmTitle")}
        message={
          pending
            ? pending.full
              ? t("startConfirmFull", {
                  total: EXAM_MODULES.reduce((n, m) => n + MODULE_MINUTES[m], 0),
                  part: t(`modules.${pending.modules[0]}`),
                  minutes: MODULE_MINUTES[pending.modules[0]],
                })
              : t("startConfirmPart", { part: t(`modules.${pending.modules[0]}`), minutes: MODULE_MINUTES[pending.modules[0]] })
            : ""
        }
        confirmLabel={t("startConfirmAction")}
        tone="primary"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          const { modules, full } = pending;
          setPending(null);
          begin(modules, full);
        }}
      />

      <section aria-labelledby="exam-history" className="card space-y-3 p-5 sm:p-6">
        <h2 id="exam-history" className="text-xl font-extrabold">
          {t("historyTitle")}
        </h2>
        {!ready || attempts.length === 0 ? (
          <p className="text-text-muted">{t("historyEmpty")}</p>
        ) : (
          <>
            <p className="text-sm font-bold text-text-muted">{t("best", { total: bestTotal(attempts), max: MAX_TOTAL })}</p>
            <ul className="space-y-1">
              {attempts.map((a, i) => (
                <li key={`${a.date}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-1 last:border-0">
                  <span dir="ltr" lang={locale}>
                    {a.date}
                  </span>
                  <span className="tabular-nums">
                    {t("total", { total: a.total, max: MAX_TOTAL })} · {isPassing(a.total) ? t("passedShort") : t("notPassedShort")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
