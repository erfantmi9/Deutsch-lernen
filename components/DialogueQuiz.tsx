"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { allQuestionsAnswered, scoreQuiz } from "@/lib/dialogueLogic";
import { seededShuffle } from "@/lib/shuffle";
import { useDialogueStore } from "@/stores/dialogueStore";
import type { QuizQuestion } from "@/types/dialogue";
import Mascot from "./illustrations/Mascot";

type Locale = "en" | "fa" | "de";

/** Four comprehension questions. Three right answers complete the dialogue. */
export default function DialogueQuiz({ dialogueId, quiz }: { dialogueId: string; quiz: QuizQuestion[] }) {
  const t = useTranslations("Dialogues.quiz");
  const locale = useLocale() as Locale;
  const recordQuiz = useDialogueStore((s) => s.recordQuiz);

  const [answers, setAnswers] = useState<(string | null)[]>(() => quiz.map(() => null));
  const [checked, setChecked] = useState(false);

  // Stable per question, so the right answer is not always first (and server and client agree).
  const options = useMemo(() => quiz.map((q, i) => seededShuffle(q.options, `${dialogueId}:${i}`)), [quiz, dialogueId]);

  const score = scoreQuiz(quiz, answers);
  const complete = allQuestionsAnswered(quiz, answers);

  const check = () => {
    if (!complete) return;
    setChecked(true);
    recordQuiz(dialogueId, score.correct);
  };

  const retry = () => {
    setAnswers(quiz.map(() => null));
    setChecked(false);
  };

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
          <fieldset key={i} className="card space-y-3 p-5">
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
                    disabled={checked}
                    onClick={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                    className={
                      "pill min-h-12 justify-center whitespace-normal py-2 text-center disabled:cursor-default " +
                      (isAnswer
                        ? "border-success bg-success-soft text-success disabled:opacity-100"
                        : isWrongPick
                          ? "border-danger bg-danger-soft text-danger disabled:opacity-100"
                          : checked
                            ? "disabled:opacity-60"
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
            {checked && (
              <p className={"text-sm font-bold " + (right ? "text-success" : "text-danger")}>
                {right ? `✓ ${t("correctMark")}` : `✗ ${t("wrongMark")}`}
                {!right && (
                  <>
                    {" · "}
                    {t("correctAnswer")}{" "}
                    <bdi dir="ltr" lang="de" className="font-extrabold">
                      {q.answer}
                    </bdi>
                  </>
                )}
              </p>
            )}
          </fieldset>
        );
      })}

      {!checked ? (
        <div className="space-y-2">
          <button type="button" onClick={check} disabled={!complete} className="btn btn-primary w-full py-3 text-lg">
            {t("check")}
          </button>
          {!complete && <p className="text-center text-sm text-text-muted">{t("answerAll")}</p>}
        </div>
      ) : (
        <div role="status" className={"flex items-center gap-4 " + (score.passed ? "feedback-success" : "feedback-error")}>
          <Mascot mood={score.passed ? "cheering" : "thinking"} size={80} className="shrink-0" />
          <div className="space-y-2">
            <p className="font-extrabold">{t("score", { correct: score.correct, total: score.total })}</p>
            <p>{score.passed ? t("passed") : t("notPassed")}</p>
            <button type="button" onClick={retry} className="btn btn-secondary">
              {t("retry")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
