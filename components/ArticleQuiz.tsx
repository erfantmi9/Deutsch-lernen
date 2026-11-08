"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuizStore } from "@/stores/quizStore";
import type { Article } from "@/types/vocab";
import type { Locale } from "@/i18n/routing";
import GrammarExplainCard from "./GrammarExplainCard";
import Mascot from "./illustrations/Mascot";
import NounIcon from "./illustrations/NounIcon";
import ConfirmDialog from "./ui/ConfirmDialog";
import FeedbackRegion from "./ui/FeedbackRegion";
import ResponsiveSheet from "./ui/ResponsiveSheet";
import ScoreStrip from "./ui/ScoreStrip";
import StickyActionBar from "./ui/StickyActionBar";
import { useScrollIntoViewOnChange } from "./ui/useScrollIntoViewOnChange";

const ARTICLES: readonly Article[] = ["der", "die", "das"];

// Full static class strings so Tailwind's JIT can see them.
const CANDY: Record<Article, string> = {
  der: "candy candy-der",
  die: "candy candy-die",
  das: "candy candy-das",
};

const AUTO_ADVANCE_MS = 1000;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

/**
 * Moves to the next word, but only if the current one has been answered. Reads the store synchronously, so a second
 * press of Enter / Space (or a keydown + click pair) in the same tick finds the new, unanswered word and does nothing:
 * Next can never skip a question that has not been answered.
 */
function advance() {
  const { currentWord, lastAnswer, next } = useQuizStore.getState();
  if (currentWord && lastAnswer?.wordId === currentWord.id) next();
}

export default function ArticleQuiz() {
  const t = useTranslations("Arcade");
  const tArticle = useTranslations("Articles");
  const locale = useLocale() as Locale;

  const currentWord = useQuizStore((s) => s.currentWord);
  const score = useQuizStore((s) => s.score);
  const streak = useQuizStore((s) => s.streak);
  const bestStreak = useQuizStore((s) => s.bestStreak);
  const lastAnswer = useQuizStore((s) => s.lastAnswer);
  const autoAdvance = useQuizStore((s) => s.autoAdvance);
  const setAutoAdvance = useQuizStore((s) => s.setAutoAdvance);
  const answer = useQuizStore((s) => s.answer);
  const reset = useQuizStore((s) => s.reset);

  const [ready, setReady] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  // Once the explanation was opened for this word, never auto-advance away from it.
  const [explained, setExplained] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);

  const wordId = currentWord?.id;
  useEffect(() => {
    setExplainOpen(false);
    setExplained(false);
  }, [wordId]);

  // Hydration guard: persisted state is loaded only on the client, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useQuizStore.persist.rehydrate()).then(() => {
      if (cancelled) return;
      if (!useQuizStore.getState().currentWord) useQuizStore.getState().next();
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const answered = lastAnswer !== null && lastAnswer.wordId === currentWord?.id;
  const correct = answered && lastAnswer.correct;
  const wrong = answered && !lastAnswer.correct;

  // Optional auto-advance after a correct answer; never while (or after) the explanation is open.
  useEffect(() => {
    if (!autoAdvance || !correct || explained) return;
    const id = window.setTimeout(advance, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(id);
  }, [autoAdvance, correct, explained, lastAnswer]);

  // After answering, focus moves to the persistent Next button (no input is ever focused in this module).
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(lastAnswer, { enabled: answered, focus: false, block: "nearest" });
  useEffect(() => {
    if (answered) actionRef.current?.focus({ preventScroll: true });
  }, [answered]);

  // Keyboard shortcuts: 1/2/3 answer; Enter advances when focus is not on a control (a focused button handles its own press).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx !== -1 && !answered) {
        answer(ARTICLES[idx]);
      } else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement) && !explainOpen && !confirmReset) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, answer, explainOpen, confirmReset]);

  if (!ready || !currentWord) {
    return (
      <div role="status" className="py-24 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  const translation = currentWord.translations[locale === "de" ? "en" : locale];
  const openExplanation = () => {
    setExplained(true);
    setExplainOpen(true);
  };

  return (
    <section aria-labelledby="quiz-title" className="mx-auto w-full max-w-xl space-y-4 short:space-y-3">
      <h2 id="quiz-title" className="sr-only">
        {t("title")}
      </h2>

      <ScoreStrip
        items={[
          [t("score"), score],
          [t("streak"), streak],
          [t("best"), bestStreak],
        ]}
      />

      {/* Word card */}
      <div
        className={
          "card-hero flex flex-col items-center p-4 text-center sm:p-8 short:p-3 " +
          (correct ? "motion-safe:animate-pop " : "") +
          (wrong ? "motion-safe:animate-shake " : "")
        }
      >
        <div className="short:hidden">
          <NounIcon id={currentWord.id} category={currentWord.category} size={80} />
        </div>
        <p className="mb-1 mt-2 text-sm font-semibold text-text-muted">{t("prompt")}</p>
        <p lang="de" dir="ltr" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          {answered && <span className="text-primary">{currentWord.article} </span>}
          {currentWord.word}
        </p>
        <p className="mt-2 text-sm text-text-muted">
          {t("plural")}: <bdi dir="ltr" lang="de">{currentWord.plural}</bdi> · <span>{translation}</span>
        </p>
      </div>

      {/* Article buttons: in the page flow (thumb zone), NOT in the sticky bar. */}
      <div role="group" aria-label={t("prompt")} className="grid grid-cols-3 gap-3">
        {ARTICLES.map((a, i) => {
          const isCorrect = answered && a === currentWord.article;
          const isChosenWrong = wrong && a === lastAnswer.chosen;
          return (
            <button
              key={a}
              type="button"
              disabled={answered}
              onClick={() => answer(a)}
              aria-label={`${tArticle(a)} (${i + 1})`}
              data-result={isCorrect ? "correct" : isChosenWrong ? "wrong" : answered ? "dim" : undefined}
              className={CANDY[a] + " short:min-h-12 short:py-2" + (isCorrect ? " motion-safe:animate-pop" : "")}
            >
              <span aria-hidden="true" className="candy-key">
                {i + 1}
              </span>
              <bdi dir="ltr">{tArticle(a)}</bdi>
              {/* Absolute, so the marker never wraps the label onto a second line (which made the buttons jump taller). */}
              {(isCorrect || isChosenWrong) && (
                <span aria-hidden="true" className="absolute end-2 top-1 text-sm font-bold sm:end-3 sm:top-2 sm:text-base">
                  {isCorrect ? "✓" : "✗"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback directly under the question; live region always mounted, height reserved. */}
      <FeedbackRegion size="sm" ref={feedbackRef}>
        {!answered && (
          <div className="flex justify-center">
            <Mascot mood="thinking" size={56} className="motion-safe:animate-float" />
          </div>
        )}
        {correct && (
          <div className="feedback-success flex items-center gap-3">
            <Mascot mood="cheering" size={48} className="shrink-0 motion-safe:animate-bounce-soft" />
            <p className="text-lg font-extrabold">✓ {t("correct")}</p>
          </div>
        )}
        {wrong && (
          <div className="feedback-error flex items-center gap-3">
            <Mascot mood="oops" size={48} className="shrink-0" />
            <p className="font-bold">
              ✗ {t("wrong")}{" "}
              <bdi dir="ltr" lang="de" className="font-extrabold text-text">
                {currentWord.article} {currentWord.word}
              </bdi>
            </p>
          </div>
        )}
      </FeedbackRegion>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            role="switch"
            checked={autoAdvance}
            onChange={(e) => setAutoAdvance(e.target.checked)}
            className="size-5 accent-primary"
          />
          {t("autoAdvance")}
        </label>
        <button type="button" onClick={() => setConfirmReset(true)} className="btn-ghost">
          {t("reset")}
        </button>
      </div>
      <p className="kbd-only text-xs text-text-muted">{t("shortcuts")}</p>

      <StickyActionBar
        ref={actionRef}
        label={
          <>
            {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </>
        }
        disabled={!answered}
        onAction={advance}
        status={answered ? null : t("chooseArticle")}
        secondary={
          // Always rendered (disabled until there is something to explain), so the bar never changes shape.
          <button type="button" disabled={!answered} onClick={openExplanation} aria-haspopup="dialog" className="btn btn-secondary shrink-0">
            {t("why")}
          </button>
        }
      />

      <ResponsiveSheet open={explainOpen} onClose={() => setExplainOpen(false)} title={t("explanationTitle")}>
        <GrammarExplainCard word={currentWord} />
      </ResponsiveSheet>

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
