import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applySentenceResult } from "@/lib/sentenceBoard";
import type { FocusFilter } from "@/lib/sentences";

interface SentenceState {
  solvedIds: string[];
  wrongIds: string[];
  streak: number;
  bestStreak: number;
  focus: FocusFilter;
  setFocus: (focus: FocusFilter) => void;
  recordResult: (id: string, correct: boolean, firstAttempt: boolean) => void;
  reset: () => void;
}

export const useSentenceStore = create<SentenceState>()(
  persist(
    (set, get) => ({
      solvedIds: [],
      wrongIds: [],
      streak: 0,
      bestStreak: 0,
      focus: "all",

      setFocus: (focus) => set({ focus }),

      recordResult: (id, correct, firstAttempt) => {
        const { solvedIds, wrongIds, streak, bestStreak } = get();
        set(applySentenceResult({ solvedIds, wrongIds, streak, bestStreak }, id, correct, firstAttempt));
        recordActivity();
      },

      reset: () => set({ solvedIds: [], wrongIds: [], streak: 0, bestStreak: 0 }),
    }),
    {
      name: "deutsch-learner:sentences",
      version: 1,
      skipHydration: true, // call useSentenceStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({
        solvedIds: s.solvedIds,
        wrongIds: s.wrongIds,
        streak: s.streak,
        bestStreak: s.bestStreak,
        focus: s.focus,
      }),
    },
  ),
);
