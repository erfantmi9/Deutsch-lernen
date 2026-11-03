import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applyScore } from "@/lib/scoreStats";
import type { ScoreMap } from "@/lib/scoreStats";

interface ReadingState {
  /** Best task score (out of four) per text. */
  results: ScoreMap;
  recordResult: (textId: string, score: number) => void;
  reset: () => void;
}

export const useReadingStore = create<ReadingState>()(
  persist(
    (set) => ({
      results: {},
      recordResult: (textId, score) => {
        set((s) => ({ results: applyScore(s.results, textId, score) }));
        recordActivity(4);
      },
      reset: () => set({ results: {} }),
    }),
    {
      name: "deutsch-learner:reading",
      version: 1,
      skipHydration: true, // call useReadingStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ results: s.results }),
    },
  ),
);
