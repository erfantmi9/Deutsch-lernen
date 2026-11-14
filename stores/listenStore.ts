import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applyDictation, applyMessage, applySound, EMPTY_LISTEN_STATS } from "@/lib/listenStats";
import type { ListenStats } from "@/lib/listenStats";
import type { SoundContrast } from "@/types/listening";

interface ListenState extends ListenStats {
  recordDictation: (id: string, passed: boolean) => void;
  recordMessage: (id: string, correct: boolean) => void;
  recordSound: (contrast: SoundContrast, correct: boolean) => void;
  reset: () => void;
}

const stats = (s: ListenState): ListenStats => ({ dictationPassed: s.dictationPassed, messagesSolved: s.messagesSolved, sounds: s.sounds });

export const useListenStore = create<ListenState>()(
  persist(
    (set, get) => ({
      ...EMPTY_LISTEN_STATS,
      recordDictation: (id, passed) => {
        set(applyDictation(stats(get()), id, passed));
        recordActivity();
      },
      recordMessage: (id, correct) => {
        set(applyMessage(stats(get()), id, correct));
        recordActivity();
      },
      recordSound: (contrast, correct) => {
        set(applySound(stats(get()), contrast, correct));
        recordActivity();
      },
      reset: () => set({ ...EMPTY_LISTEN_STATS }),
    }),
    {
      name: "deutsch-learner:listen",
      version: 1,
      skipHydration: true, // call useListenStore.persist.rehydrate() on the client after mount
      partialize: (s) => stats(s),
    },
  ),
);
