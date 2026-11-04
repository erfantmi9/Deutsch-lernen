"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuizStore } from "@/stores/quizStore";
import type { Article } from "@/types/vocab";
import type { Locale } from "@/i18n/routing";
import GrammarExplainCard from "./GrammarExplainCard";
import Mascot from "./illustrations/Mascot";
import NounIcon from "./illustrations/NounIcon";

const ARTICLES: readonly Article[] = ["der", "die", "das"];

// Full static class strings so Tailwind's JIT can see them.
const CANDY: Record<Article, string> = {
  der: "candy candy-der",
  die: "candy candy-die",
  das: "candy candy-das",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
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
  const answer = useQuizStore((s) => s.answer);
  const next = useQuizStore((s) => s.next);
  const reset = useQuizStore((s) => s.reset);

  const [ready, setReady] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  // Close the on-demand explanation whenever the word changes.
  const wordId = currentWord?.id;
  useEffect(() => setShowWhy(false), [wordId]);

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

  // Auto-advance after a correct answer.
  useEffect(() => {
    if (!correct || showWhy) return;
    const id = window.setTimeout(() => next(), 1000);
    return () => window.clearTimeout(id);
  }, [correct, showWhy, lastAnswer, next]);

  // Keyboard shortcuts: 1/2/3 answer, Enter/Space -> next after a wrong answer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const idx = ["1", "2", "3"].indexOf(e.key);
      if (idx !== -1 && !answered) {
        answer(ARTICLES[idx]);
      } else if (e.key === "Enter" && (wrong || (correct && showWhy))) {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, wrong, correct, showWhy, answer, next]);

  if (!ready || !currentWord) {
    return (
      <div role="status" className="py-24 text-center text-text-muted">
        {t("loading")}
      </div>
    );
  }

  const translation = currentWord.translations[locale === "de" ? "en" : locale];

  return (
    <section aria-labelledby="quiz-title" className="mx-auto w-full max-w-xl space-y-6">
      <h2 id="quiz-title" className="sr-only">
        {t("title")}
      </h2>

      {/* Score board */}
      <dl className="grid grid-cols-3 gap-3">
        {[
          [t("score"), score],
          [t("streak"), streak],
          [t("best"), bestStreak],
        ].map(([label, value]) => (
          <div key={label} className="stat">
            <dt className="eyebrow">{label}</dt>
            <dd className="text-2xl font-extrabold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Word card */}
      <div
        className={
          "card-hero flex flex-col items-center p-6 text-center sm:p-8 " +
          (correct ? "motion-safe:animate-pop " : "") +
          (wrong ? "motion-safe:animate-shake " : "")
        }
      >
        <NounIcon id={currentWord.id} category={currentWord.category} size={112} />
        <p className="mb-2 mt-4 text-sm font-semibold text-text-muted">{t("prompt")}</p>
        <p lang="de" dir="ltr" className="text-5xl font-extrabold tracking-tight">
          {answered && <span className="text-primary">{currentWord.article} </span>}
          {currentWord.word}
        </p>
        <p className="mt-3 text-sm text-text-muted">
          {t("plural")}: <bdi dir="ltr" lang="de">{currentWord.plural}</bdi> · <span>{translation}</span>
        </p>
      </div>

      {/* Article buttons */}
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
              className={
                CANDY[a] +
                (isCorrect ? " ring-4 ring-text ring-offset-2 ring-offset-background motion-safe:animate-bounce-soft" : "") +
                (answered && !isCorrect ? " opacity-40" : "")
              }
            >
              <span aria-hidden="true" className="absolute start-3 top-1.5 text-xs font-bold opacity-80">
                {i + 1}
              </span>
              <bdi dir="ltr">{tArticle(a)}</bdi>
              {isCorrect && <span aria-hidden="true"> ✓</span>}
              {isChosenWrong && <span aria-hidden="true"> ✗</span>}
            </button>
          );
        })}
      </div>

      {/* Feedback (aria-live) */}
      <div aria-live="polite" role="status" className="min-h-[6rem]">
        {!answered && (
          <div className="flex justify-center">
            <Mascot mood="thinking" size={88} className="motion-safe:animate-float" />
          </div>
        )}
        {correct && (
          <div className="space-y-3">
            <div className="feedback-success flex items-center gap-4">
              <Mascot mood="cheering" size={88} className="shrink-0 motion-safe:animate-bounce-soft" />
              <p className="text-lg font-extrabold">✓ {t("correct")}</p>
            </div>
            {!showWhy && (
              <button type="button" onClick={() => setShowWhy(true)} className="pill">
                {t("why")}
              </button>
            )}
            {showWhy && (
              <>
                <GrammarExplainCard word={currentWord} />
                {/* Auto-advance is cancelled while the explanation is open, so a Next control must be visible. */}
                <button type="button" onClick={() => next()} autoFocus className="btn btn-primary">
                  {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                </button>
              </>
            )}
          </div>
        )}
        {wrong && (
          <div className="feedback-error space-y-3">
            <div className="flex items-center gap-4">
              <Mascot mood="sad" size={88} className="shrink-0" />
              <p className="font-bold">
                ✗ {t("wrong")}{" "}
                <bdi dir="ltr" lang="de" className="font-extrabold text-text">
                  {currentWord.article} {currentWord.word}
                </bdi>
              </p>
            </div>
            <GrammarExplainCard word={currentWord} />
            <button type="button" onClick={() => next()} autoFocus className="btn btn-primary">
              {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
        <span>{t("shortcuts")}</span>
        <button type="button" onClick={() => reset()} className="btn-ghost">
          {t("reset")}
        </button>
      </div>
    </section>
  );
}
