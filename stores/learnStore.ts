import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_GOAL, isGoal } from "@/lib/learningPath";
import type { DailyGoal } from "@/lib/learningPath";

interface LearnState {
  /** Locale-less path of the last learning page that was opened, e.g. "/grammar/dative". */
  lastVisit: string | null;
  dailyGoal: DailyGoal;
  setLastVisit: (path: string) => void;
  setDailyGoal: (goal: DailyGoal) => void;
}

export const useLearnStore = create<LearnState>()(
  persist(
    (set) => ({
      lastVisit: null,
      dailyGoal: DEFAULT_GOAL,
      setLastVisit: (path) => set({ lastVisit: path }),
      setDailyGoal: (goal) => set({ dailyGoal: goal }),
    }),
    {
      name: "deutsch-learner:learn",
      version: 1,
      skipHydration: true, // call ensureLearnHydrated() on the client after mount
      partialize: (s) => ({ lastVisit: s.lastVisit, dailyGoal: s.dailyGoal }),
      migrate: (persisted) => {
        const p = (persisted ?? {}) as { lastVisit?: unknown; dailyGoal?: unknown };
        return {
          lastVisit: typeof p.lastVisit === "string" && p.lastVisit.startsWith("/") ? p.lastVisit : null,
          dailyGoal: isGoal(p.dailyGoal) ? p.dailyGoal : DEFAULT_GOAL,
        };
      },
    },
  ),
);

let hydration: Promise<void> | null = null;

/** Loads the saved values once per page load. Must finish before any write, or the saved goal would be replaced. */
export function ensureLearnHydrated(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  hydration ??= Promise.resolve(useLearnStore.persist.rehydrate()).then(() => undefined);
  return hydration;
}
