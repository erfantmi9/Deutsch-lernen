"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useVerbStore } from "@/stores/verbStore";
import {
  checkAnswer,
  checkPerfekt,
  pickQuestion,
  presentAnswers,
  PRONOUN,
} from "@/lib/verbDrill";
import type { DrillMode, DrillQuestion } from "@/lib/verbDrill";
import { perfektForms } from "@/lib/verbs";
import type { VerbEntry } from "@/types/verb";
import Mascot from "./illustrations/Mascot";
import SpecialCharBar from "./SpecialCharBar";
import ConfirmDialog from "./ui/ConfirmDialog";
import FeedbackRegion from "./ui/FeedbackRegion";
import StickyActionBar from "./ui/StickyActionBar";
import { useKeyboardInset } from "./ui/useKeyboardInset";
import { useScrollIntoViewOnChange } from "./ui/useScrollIntoViewOnChange";

const MODES: readonly DrillMode[] = ["present", "perfekt", "mixed"];

interface Result {
  correct: boolean;
  umlautHint: boolean;
  auxWrong: boolean;
  expected: string;
}

export default function VerbDrill({ pool, onExit }: { pool: readonly VerbEntry[]; onExit: () => void }) {
  const t = useTranslations("Verbs");
  const locale = useLocale() as "en" | "fa" | "de";

  const score = useVerbStore((s) => s.score);
  const streak = useVerbStore((s) => s.streak);
  const bestStreak = useVerbStore((s) => s.bestStreak);
  const mode = useVerbStore((s) => s.mode);
  const setMode = useVerbStore((s) => s.setMode);
  const recordResult = useVerbStore((s) => s.recordResult);
  const reset = useVerbStore((s) => s.reset);

  const [ready, setReady] = useState(false);
  const [question, setQuestion] = useState<DrillQuestion | null>(null);
  const [input, setInput] = useState("");
  const [aux, setAux] = useState<"haben" | "sein" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const keyboard = useKeyboardInset();
  // Result appears directly under the question; keep it inside the viewport (above the sticky bar).
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(result, { enabled: result !== null, focus: false, block: "nearest" });

  const newQuestion = useCallback(
    (m: DrillMode, lastVerbId: string | null) => {
      const { wrongVerbIds } = useVerbStore.getState();
      setQuestion(pickQuestion(pool, m, wrongVerbIds, lastVerbId));
      setInput("");
      setAux(null);
      setResult(null);
    },
    [pool],
  );

  // Hydration guard: persisted state loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useVerbStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      newQuestion(useVerbStore.getState().mode, null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [newQuestion]);

  // Focus: input for every new question; the persistent action button once answered (so focus never drops).
  useEffect(() => {
    if (!question) return;
    if (result) actionRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus();
  }, [question, result]);

  // Keyboard open: keep the question + field above the keyboard bar (aligning the form END keeps the card visible too).
  useEffect(() => {
    if (keyboard > 0) formRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [keyboard]);

  const changeMode = (m: DrillMode) => {
    setMode(m);
    newQuestion(m, question?.verb.id ?? null);
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

  const check = () => {
    if (!question || result) return;
    const { verb, person, kind } = question;

    let res: Result;
    if (kind === "present") {
      const { display, accepted } = presentAnswers(verb, person);
      const outcome = checkAnswer(input, accepted);
      res = { correct: outcome === "correct", umlautHint: outcome === "umlaut", auxWrong: false, expected: display };
    } else {
      const outcome = checkPerfekt(aux, input, verb);
      res = {
        correct: outcome.correct,
        umlautHint: outcome.participle === "umlaut",
        auxWrong: !outcome.auxCorrect,
        expected: perfektForms(verb)[person],
      };
    }
    setResult(res);
    recordResult(verb.id, res.correct);
  };

  const next = () => newQuestion(mode, question?.verb.id ?? null);

  if (!ready || !question) {
    return (
      <div role="status" className="py-16 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  const { verb, person, kind } = question;
  const translation = verb.translations[locale === "de" ? "en" : locale];
  const hasInput = input.trim().length > 0;
  const canSubmit = hasInput && (kind === "present" || aux !== null);
  // Why the primary action is disabled, spelled out.
  const missing = [kind === "perfekt" && aux === null ? t("missingAux") : null, !hasInput ? t("missingAnswer") : null].filter(Boolean);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (result) next();
    else if (canSubmit) check();
  };

  return (
    <section aria-labelledby="drill-title" className="mx-auto w-full max-w-xl space-y-4">
      <div className="kb-hide flex items-center justify-between">
        <h2 id="drill-title" className="text-2xl font-extrabold">
          {t("practiceTitle")}
        </h2>
        <button type="button" onClick={onExit} className="btn-ghost">
          <span aria-hidden="true" className="me-1 rtl:-scale-x-100">←</span> {t("backToList")}
        </button>
      </div>

      {/* Mode selector */}
      <div role="radiogroup" aria-label={t("mode")} className="kb-hide flex gap-1 rounded-full border border-border bg-surface-2 p-1">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => changeMode(m)}
            className="pill flex-1 justify-center border-transparent bg-transparent"
          >
            {t(`modes.${m}`)}
          </button>
        ))}
      </div>

      {/* Scoreboard: one compact row so the question and its feedback fit on a phone. */}
      <dl className="kb-hide flex items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm shadow-soft">
        {(
          [
            [t("score"), score],
            [t("streak"), streak],
            [t("best"), bestStreak],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-1.5">
            <dt className="eyebrow">{label}</dt>
            <dd className="font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <form ref={formRef} onSubmit={onSubmit} className="scroll-target space-y-3" noValidate>
        {/* Prompt */}
        <div className="card-hero p-4 text-center">
          <p className="eyebrow mb-1">{kind === "present" ? t("tabs.praesens") : t("tabs.perfekt")}</p>
          <p dir="ltr" lang="de" className="text-3xl font-extrabold">
            <span className="text-primary">{PRONOUN[person]}</span>
            {" · "}
            {verb.infinitive}
          </p>
          <p className="mt-1 text-sm text-text-muted">{translation}</p>
          {kind === "present" && verb.separable && (
            <p className="mt-2 rounded-2xl bg-role-verb px-3 py-2 text-xs">{t("separableDrillHint", { prefix: verb.separable.prefix })}</p>
          )}
        </div>

        {/* Auxiliary choice (Perfekt) */}
        {kind === "perfekt" && (
          <div role="radiogroup" aria-label={t("chooseAux")} className="grid grid-cols-2 gap-3">
            {(["haben", "sein"] as const).map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={aux === a}
                disabled={result !== null}
                onClick={() => setAux(a)}
                className="pill min-h-12 justify-center text-lg disabled:opacity-60"
              >
                <bdi dir="ltr" lang="de">
                  {a}
                </bdi>
                {aux === a && <span aria-hidden="true"> ✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Answer input */}
        <div>
          <label htmlFor="verb-answer" className="kb-sr mb-1 block text-sm font-bold text-text-muted">
            {kind === "present" ? t("typeForm") : t("typePartizip")}
          </label>
          <input
            id="verb-answer"
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
            enterKeyHint="done"
            className="w-full rounded-full border-2 border-border bg-surface px-6 py-3 text-xl text-text shadow-soft outline-none placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-60"
          />
        </div>

        {keyboard === 0 && <SpecialCharBar disabled={result !== null} onInsert={insertChar} />}
      </form>

      {/* Feedback: directly under the question, live region always mounted, height reserved. */}
      <FeedbackRegion ref={feedbackRef}>
        {result && (
          <div className={"space-y-2 " + (result.correct ? "feedback-success" : "feedback-error")}>
            <div className="flex items-center gap-3">
              <Mascot
                mood={result.correct ? "cheering" : "sad"}
                size={56}
                className={"shrink-0 " + (result.correct ? "motion-safe:animate-bounce-soft" : "")}
              />
              <p className="font-bold">
                {result.correct ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}{" "}
                <bdi dir="ltr" lang="de" className="font-extrabold text-text">
                  {PRONOUN[person]} {result.expected}
                </bdi>
              </p>
            </div>
            {result.umlautHint && <p className="feedback-hint">⚠ {t("umlautHint")}</p>}
            {result.auxWrong && <p className="feedback-hint">⚠ {t("auxHint", { aux: verb.perfekt.auxiliary })}</p>}
          </div>
        )}
      </FeedbackRegion>

      <div className="text-end">
        <button type="button" onClick={() => setConfirmReset(true)} className="btn-ghost">
          {t("reset")}
        </button>
      </div>

      <StickyActionBar
        ref={actionRef}
        label={
          result ? (
            <>
              {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </>
          ) : (
            t("check")
          )
        }
        disabled={!result && !canSubmit}
        onAction={() => (result ? next() : check())}
        status={result ? null : missing.join(" · ")}
        toolbar={keyboard > 0 ? <SpecialCharBar compact disabled={result !== null} onInsert={insertChar} /> : null}
      />

      <ConfirmDialog
        open={confirmReset}
        title={t("resetConfirmTitle")}
        message={t("resetConfirmBody")}
        confirmLabel={t("reset")}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          reset();
          setConfirmReset(false);
        }}
      />
    </section>
  );
}
