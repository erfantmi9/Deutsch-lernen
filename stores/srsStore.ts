import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dateKey } from "@/lib/dateKey";
import { clampNewPerDay, isNew, newCard, recordInLog, review } from "@/lib/srs";
import type { Grade } from "@/lib/srs";
import { emptySrsState, migrateSrs, mergeSrsStates, SRS_STATE_VERSION } from "@/lib/srsData";
import type { SrsState } from "@/lib/srsData";
import { recordActivity } from "./activityStore";

interface SrsStore extends SrsState {
  /** Adds cards to the deck; ids already in the deck are left alone. Returns how many were added. */
  addCards: (ids: readonly string[]) => number;
  /** Only cards that have not been answered yet can be taken out (so progress is never lost by accident). */
  removeCard: (id: string) => void;
  grade: (id: string, grade: Grade) => void;
  setNewPerDay: (n: number) => void;
  /** `replace` swaps the whole deck; `merge` keeps the newer progress per card. */
  importState: (incoming: SrsState, mode: "replace" | "merge") => void;
  reset: () => void;
}

export const useSrsStore = create<SrsStore>()(
  persist(
    (set, get) => ({
      ...emptySrsState(),

      addCards: (ids) => {
        const today = dateKey();
        const cards = { ...get().cards };
        let added = 0;
        for (const id of ids) {
          if (cards[id]) continue;
          cards[id] = newCard(id, today);
          added++;
        }
        if (added > 0) set({ cards });
        return added;
      },

      removeCard: (id) => {
        const card = get().cards[id];
        if (!card || !isNew(card)) return;
        const { [id]: _removed, ...rest } = get().cards;
        void _removed;
        set({ cards: rest });
      },

      grade: (id, grade) => {
        const card = get().cards[id];
        if (!card) return;
        const today = dateKey();
        set((s) => ({
          cards: { ...s.cards, [id]: review(card, grade, today) },
          log: recordInLog(s.log, today, isNew(card)),
        }));
        recordActivity();
      },

      setNewPerDay: (n) => set({ newPerDay: clampNewPerDay(n) }),

      importState: (incoming, mode) =>
        set((s) => {
          if (mode === "replace") return { cards: incoming.cards, log: incoming.log, newPerDay: incoming.newPerDay };
          const merged = mergeSrsStates({ cards: s.cards, log: s.log, newPerDay: s.newPerDay }, incoming);
          return { cards: merged.cards, log: merged.log, newPerDay: merged.newPerDay };
        }),

      reset: () => set(emptySrsState()),
    }),
    {
      name: "deutsch-learner:srs",
      version: SRS_STATE_VERSION,
      skipHydration: true, // call useSrsStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ cards: s.cards, log: s.log, newPerDay: s.newPerDay }),
      migrate: (persisted, version) => migrateSrs(persisted, version),
    },
  ),
);

let hydration: Promise<void> | null = null;

/** Loads the saved deck once per page load, however many components ask. */
export function ensureSrsHydrated(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  hydration ??= Promise.resolve(useSrsStore.persist.rehydrate()).then(() => undefined);
  return hydration;
}
