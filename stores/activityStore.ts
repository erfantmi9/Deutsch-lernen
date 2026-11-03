import { create } from "zustand";
import { persist } from "zustand/middleware";
import { bumpActivity } from "@/lib/activity";
import type { ActivityDays } from "@/lib/activity";
import { dateKey, isDateKey } from "@/lib/dateKey";

interface ActivityState {
  /** Answers and finished exercises per local calendar day. Feeds the streak and the calendar. */
  days: ActivityDays;
  bump: (amount?: number) => void;
  reset: () => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      days: {},
      bump: (amount = 1) => set((s) => ({ days: bumpActivity(s.days, dateKey(), amount) })),
      reset: () => set({ days: {} }),
    }),
    {
      name: "deutsch-learner:activity",
      version: 1,
      skipHydration: true, // call useActivityStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ days: s.days }),
      migrate: (persisted) => {
        const days: Record<string, number> = {};
        const raw = (persisted as { days?: Record<string, unknown> } | null)?.days ?? {};
        for (const [k, v] of Object.entries(raw)) {
          if (isDateKey(k) && typeof v === "number" && v > 0) days[k] = v;
        }
        return { days };
      },
    },
  ),
);

/**
 * Called by the other stores whenever the learner answers something. Makes sure the saved days
 * are loaded first, so a write can never replace them with an empty object.
 */
export function recordActivity(amount = 1): void {
  if (typeof window === "undefined") return;
  if (!useActivityStore.persist.hasHydrated()) void useActivityStore.persist.rehydrate();
  useActivityStore.getState().bump(amount);
}
