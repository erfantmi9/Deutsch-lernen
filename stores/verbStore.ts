import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applyResult } from "@/lib/verbDrill";
import type { DrillMode } from "@/lib/verbDrill";

interface VerbState {
  score: number;
  streak: number;
  bestStreak: number;
  wrongVerbIds: string[];
  mode: DrillMode;
  setMode: (mode: DrillMode) => void;
  recordResult: (verbId: string, correct: boolean) => void;
  reset: () => void;
}

export const useVerbStore = create<VerbState>()(
  persist(
    (set, get) => ({
      score: 0,
      streak: 0,
      bestStreak: 0,
      wrongVerbIds: [],
      mode: "present",

      setMode: (mode) => set({ mode }),

      recordResult: (verbId, correct) => {
        const { score, streak, bestStreak, wrongVerbIds } = get();
        set(applyResult({ score, streak, bestStreak, wrongVerbIds }, verbId, correct));
        recordActivity();
      },

      reset: () => set({ score: 0, streak: 0, bestStreak: 0, wrongVerbIds: [] }),
    }),
    {
      name: "deutsch-learner:verbs",
      version: 1,
      skipHydration: true, // call useVerbStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({
        score: s.score,
        streak: s.streak,
        bestStreak: s.bestStreak,
        wrongVerbIds: s.wrongVerbIds,
        mode: s.mode,
      }),
    },
  ),
);
