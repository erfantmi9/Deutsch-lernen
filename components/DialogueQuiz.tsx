"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { allQuestionsAnswered, scoreQuiz } from "@/lib/dialogueLogic";
import { seededShuffle } from "@/lib/shuffle";
import { useDialogueStore } from "@/stores/dialogueStore";
import type { QuizQuestion } from "@/types/dialogue";
import Mascot from "./illustrations/Mascot";
import StickyActionBar from "./ui/StickyActionBar";

type Locale = "en" | "fa" | "de";

/** Scrolls an element into view (html scroll-padding keeps it clear of header and bar) and focuses it. */
export function scrollAndFocus(el: HTMLElement | null | undefined) {
  if (!el) return;
  el.classList.add("scroll-target");
  if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

/**
 * Four comprehension questions. Three right answers complete the dialogue.
 * Check lives in the StickyActionBar; its status ("2/4 answered · Missing: 3, 4", then the score) is the single live
 * region. After checking, the first wrong question (or the result) is scrolled to and focused.
 */
export default function DialogueQuiz({ dialogueId, quiz }: { dialogueId: string; quiz: QuizQuestion[] }) {
  const t = useTranslations("Dialogues.quiz");
  const locale = useLocale() as Locale;
  const recordQuiz = useDialogueStore((s) => s.recordQuiz);

  const [answers, setAnswers] = useState<(string | null)[]>(() => quiz.map(() => null));
  const [checked, setChecked] = useState(false);
  const questionRefs = useRef<(HTMLFieldSetElement | null)[]>([]);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const pendingFocus = useRef<"wrong" | "first" | null>(null);

  // Stable per question, so the right answer is not always first (and server and client agree).
  const options = useMemo(() => quiz.map((q, i) => seededShuffle(q.options, `${dialogueId}:${i}`)), [quiz, dialogueId]);

  const score = scoreQuiz(quiz, answers);
  const complete = allQuestionsAnswered(quiz, answers);
  const missing = answers.flatMap((a, i) => (a === null ? [String(i + 1)] : []));

  useEffect(() => {
    const what = pendingFocus.current;
    pendingFocus.current = null;
    if (what === "wrong") {
      const firstWrong = score.perQuestion.findIndex((ok) => !ok);
      scrollAndFocus(firstWrong >= 0 ? questionRefs.current[firstWrong] : resultRef.current);
    }
    if (what === "first") scrollAndFocus(questionRefs.current[0]);
  });

  const check = () => {
    if (!complete || checked) return;
    setChecked(true);
    recordQuiz(dialogueId, score.correct);
    pendingFocus.current = "wrong";
  };

  const retry = () => {
    setAnswers(quiz.map(() => null));
    setChecked(false);
    pendingFocus.current = "first";
  };

  const status = checked
    ? `${t("score", { correct: score.correct, total: score.total })} ${score.passed ? t("passed") : t("notPassed")}`
    : t("progress", { answered: quiz.length - missing.length, total: quiz.length }) +
      (missing.length > 0 ? ` · ${t("missing", { items: missing.join(", ") })}` : "");

  return (
    <section aria-labelledby="quiz-title" className="space-y-4">
      <div>
        <h3 id="quiz-title" className="text-xl font-extrabold">
          {t("title")}
        </h3>
        <p className="text-sm text-text-muted">{t("intro")}</p>
      </div>

      {quiz.map((q, i) => {
        const right = score.perQuestion[i];
        return (
          <fieldset
            key={i}
            ref={(el) => {
              questionRefs.current[i] = el;
            }}
            data-question={i + 1}
            className="card space-y-3 p-5"
          >
            <legend className="sr-only">{t("question", { n: i + 1, total: quiz.length })}</legend>
            <p className="eyebrow">{t("question", { n: i + 1, total: quiz.length })}</p>
            <p className="font-extrabold">{q.question[locale]}</p>
            <div role="group" aria-label={q.question[locale]} className="grid gap-2 sm:grid-cols-3">
              {options[i].map((opt) => {
                const selected = answers[i] === opt;
                const isAnswer = checked && opt === q.answer;
                const isWrongPick = checked && selected && !right;
                return (
                  <button
                    key={opt}
                    type="button"
                    aria-pressed={selected}
                    aria-disabled={checked}
                    onClick={() => !checked && setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                    className={
                      "pill min-h-12 justify-center whitespace-normal py-2 text-center aria-disabled:cursor-default " +
                      (isAnswer
                        ? "border-success bg-success-soft text-success"
                        : isWrongPick
                          ? "border-danger bg-danger-soft text-danger"
                          : checked
                            ? "opacity-60"
                            : "")
                    }
                  >
                    <bdi dir="ltr" lang="de">
                      {opt}
                    </bdi>
                    {isAnswer && <span aria-hidden="true"> ✓</span>}
                    {isWrongPick && <span aria-hidden="true"> ✗</span>}
                  </button>
                );
              })}
            </div>
            {/* Reserved two lines: the verdict appearing never moves the questions below. */}
            <div data-verdict className="min-h-10 text-sm font-bold leading-5">
              {checked && (
                <>
                  <p className={right ? "text-success" : "text-danger"}>{right ? `✓ ${t("correctMark")}` : `✗ ${t("wrongMark")}`}</p>
                  {!right && (
                    <p className="line-clamp-1 text-danger">
                      {t("correctAnswer")}{" "}
                      <bdi dir="ltr" lang="de" className="font-extrabold">
                        {q.answer}
                      </bdi>
                    </p>
                  )}
                </>
              )}
            </div>
          </fieldset>
        );
      })}

      {checked && (
        <div className={"flex items-center gap-4 " + (score.passed ? "feedback-success" : "feedback-error")}>
          <Mascot mood={score.passed ? "cheering" : "thinking"} size={80} className="shrink-0" />
          <div className="space-y-2">
            <p ref={resultRef} data-quiz-result className="font-extrabold">
              {t("score", { correct: score.correct, total: score.total })}
            </p>
            <p>{score.passed ? t("passed") : t("notPassed")}</p>
          </div>
        </div>
      )}

      <StickyActionBar
        label={checked ? t("retry") : t("check")}
        disabled={!checked && !complete}
        onAction={checked ? retry : check}
        status={status}
        statusTone={checked ? (score.passed ? "success" : "danger") : "hint"}
      />
    </section>
  );
}
