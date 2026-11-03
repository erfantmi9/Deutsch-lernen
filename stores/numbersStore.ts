import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applyNumbersResult, EMPTY_NUMBERS_STATS } from "@/lib/numbersStats";
import type { NumberDrillKind, NumbersStats } from "@/lib/numbersStats";

interface NumbersState extends NumbersStats {
  kind: NumberDrillKind;
  setKind: (kind: NumberDrillKind) => void;
  recordResult: (kind: NumberDrillKind, correct: boolean) => void;
  reset: () => void;
}

const stats = (s: NumbersState): NumbersStats => ({ byKind: s.byKind, streak: s.streak, bestStreak: s.bestStreak });

export const useNumbersStore = create<NumbersState>()(
  persist(
    (set, get) => ({
      ...EMPTY_NUMBERS_STATS,
      kind: "cardinal",

      setKind: (kind) => set({ kind }),

      recordResult: (kind, correct) => {
        set(applyNumbersResult(stats(get()), kind, correct));
        recordActivity();
      },

      reset: () => set({ ...EMPTY_NUMBERS_STATS }),
    }),
    {
      name: "deutsch-learner:numbers",
      version: 1,
      skipHydration: true, // call useNumbersStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ byKind: s.byKind, streak: s.streak, bestStreak: s.bestStreak, kind: s.kind }),
    },
  ),
);
