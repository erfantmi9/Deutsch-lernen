import type { GrammarExercise } from "../types/grammar";
import { checkAnswer, normalizeAnswer } from "./verbDrill";
import type { CheckResult } from "./verbDrill";

export type GrammarCheck = CheckResult;

export function acceptedFor(exercise: GrammarExercise): string[] {
  return [exercise.answer, ...(exercise.acceptedAnswers ?? [])];
}

/**
 * Choice answers must match an accepted answer (case-insensitive).
 * Typed answers are case-insensitive but strict about ä ö ü ß; an answer that is only wrong
 * because of umlauts returns "umlaut" so the UI can hint (same rules as the verb drill).
 */
export function checkGrammarAnswer(exercise: GrammarExercise, input: string): GrammarCheck {
  const accepted = acceptedFor(exercise);
  if (exercise.type === "choice") {
    const a = normalizeAnswer(input);
    return a.length > 0 && accepted.some((x) => normalizeAnswer(x) === a) ? "correct" : "wrong";
  }
  return checkAnswer(input, accepted);
}

// ---------------------------------------------------------------- progress

export interface ExerciseResult {
  attempts: number;
  /** Number of correct answers so far (an exercise counts as solved when this is > 0). */
  correct: number;
  lastCorrect: boolean;
}

export type ResultMap = Readonly<Record<string, ExerciseResult>>;

export interface GrammarStats {
  results: ResultMap;
  wrongIds: string[];
  streak: number;
  bestStreak: number;
  completedLessonIds: string[];
}

export const EMPTY_STATS: GrammarStats = {
  results: {},
  wrongIds: [],
  streak: 0,
  bestStreak: 0,
  completedLessonIds: [],
};

export function applyGrammarResult(stats: GrammarStats, exerciseId: string, correct: boolean): GrammarStats {
  const prev = stats.results[exerciseId] ?? { attempts: 0, correct: 0, lastCorrect: false };
  const streak = correct ? stats.streak + 1 : 0;
  return {
    ...stats,
    results: {
      ...stats.results,
      [exerciseId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastCorrect: correct,
      },
    },
    wrongIds: correct
      ? stats.wrongIds.filter((id) => id !== exerciseId)
      : stats.wrongIds.includes(exerciseId)
        ? stats.wrongIds
        : [...stats.wrongIds, exerciseId],
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}

export interface LessonProgress {
  solved: number;
  total: number;
  /** 0-1 */
  fraction: number;
}

/** An exercise is solved once it has been answered correctly at least one time. */
export function lessonProgress(exerciseIds: readonly string[], results: ResultMap): LessonProgress {
  const total = exerciseIds.length;
  const solved = exerciseIds.filter((id) => (results[id]?.correct ?? 0) > 0).length;
  return { solved, total, fraction: total === 0 ? 0 : solved / total };
}

export function isLessonComplete(exerciseIds: readonly string[], results: ResultMap): boolean {
  return exerciseIds.length > 0 && lessonProgress(exerciseIds, results).solved === exerciseIds.length;
}

/** Adds the lesson to `completedLessonIds` when all its exercises are solved. Completion is never removed. */
export function withLessonCompletion(
  stats: GrammarStats,
  lessonId: string,
  exerciseIds: readonly string[],
): GrammarStats {
  if (stats.completedLessonIds.includes(lessonId) || !isLessonComplete(exerciseIds, stats.results)) return stats;
  return { ...stats, completedLessonIds: [...stats.completedLessonIds, lessonId] };
}

/** Share of all exercises of the given lessons that are solved (0-1). */
export function overallProgress(lessons: ReadonlyArray<{ exerciseIds: readonly string[] }>, results: ResultMap): number {
  const ids = lessons.flatMap((l) => l.exerciseIds);
  return ids.length === 0 ? 0 : lessonProgress(ids, results).fraction;
}

// ---------------------------------------------------------------- practice queue

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Orders a practice session: exercises answered wrongly first, then ones never solved,
 * then the rest. Each group is shuffled.
 */
export function buildPracticeQueue(
  exercises: readonly GrammarExercise[],
  stats: Pick<GrammarStats, "results" | "wrongIds">,
  rng: () => number = Math.random,
): GrammarExercise[] {
  const wrong = exercises.filter((e) => stats.wrongIds.includes(e.id));
  const unsolved = exercises.filter((e) => !stats.wrongIds.includes(e.id) && (stats.results[e.id]?.correct ?? 0) === 0);
  const solved = exercises.filter((e) => !stats.wrongIds.includes(e.id) && (stats.results[e.id]?.correct ?? 0) > 0);
  return [...shuffle(wrong, rng), ...shuffle(unsolved, rng), ...shuffle(solved, rng)];
}
