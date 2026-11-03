import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applyGrammarResult, EMPTY_STATS, withLessonCompletion } from "@/lib/grammarLogic";
import type { GrammarStats, ResultMap } from "@/lib/grammarLogic";

interface GrammarState {
  completedLessonIds: string[];
  results: ResultMap;
  wrongIds: string[];
  streak: number;
  bestStreak: number;
  /**
   * Records one answer. `lessonExerciseIds` is the full exercise list of the lesson, so the store can
   * mark the lesson as completed without importing the lesson data into the client bundle.
   */
  recordResult: (lessonId: string, exerciseId: string, correct: boolean, lessonExerciseIds: readonly string[]) => void;
  reset: () => void;
}

const pick = (s: GrammarState): GrammarStats => ({
  results: s.results,
  wrongIds: s.wrongIds,
  streak: s.streak,
  bestStreak: s.bestStreak,
  completedLessonIds: s.completedLessonIds,
});

export const useGrammarStore = create<GrammarState>()(
  persist(
    (set, get) => ({
      ...EMPTY_STATS,

      recordResult: (lessonId, exerciseId, correct, lessonExerciseIds) => {
        const next = withLessonCompletion(
          applyGrammarResult(pick(get()), exerciseId, correct),
          lessonId,
          lessonExerciseIds,
        );
        set(next);
        recordActivity();
      },

      reset: () => set({ ...EMPTY_STATS }),
    }),
    {
      name: "deutsch-learner:grammar",
      version: 1,
      skipHydration: true, // call useGrammarStore.persist.rehydrate() on the client after mount
      // Add a case per version when the persisted shape changes; unknown shapes fall back to a clean state.
      migrate: (persisted, version) => {
        if (version === 1) return persisted as GrammarState;
        return { ...EMPTY_STATS } as unknown as GrammarState;
      },
      partialize: (s) => ({
        completedLessonIds: s.completedLessonIds,
        results: s.results,
        wrongIds: s.wrongIds,
        streak: s.streak,
        bestStreak: s.bestStreak,
      }),
    },
  ),
);
