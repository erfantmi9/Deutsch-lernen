import type { QuizQuestion } from "../types/dialogue";
import { PASS_MARK } from "./scoreStats";

export interface QuizScore {
  correct: number;
  total: number;
  perQuestion: boolean[];
  passed: boolean;
}

/** `answers[i]` is the option picked for question i (null when not answered). */
export function scoreQuiz(quiz: readonly Pick<QuizQuestion, "answer">[], answers: readonly (string | null)[]): QuizScore {
  const perQuestion = quiz.map((q, i) => answers[i] === q.answer);
  const correct = perQuestion.filter(Boolean).length;
  return { correct, total: quiz.length, perQuestion, passed: correct >= PASS_MARK };
}

export function allQuestionsAnswered(quiz: readonly unknown[], answers: readonly (string | null)[]): boolean {
  return quiz.length > 0 && quiz.every((_, i) => answers[i] !== null && answers[i] !== undefined);
}
