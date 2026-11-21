import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { applySpeak, EMPTY_SPEAK_STATS } from "@/lib/speakCheck";
import type { SpeakStats } from "@/lib/speakCheck";

interface SpeakState extends SpeakStats {
  recordSpeak: (id: string, passed: boolean) => void;
  reset: () => void;
}

export const useSpeakStore = create<SpeakState>()(
  persist(
    (set, get) => ({
      ...EMPTY_SPEAK_STATS,
      recordSpeak: (id, passed) => {
        set(applySpeak({ speakPassed: get().speakPassed }, id, passed));
        recordActivity();
      },
      reset: () => set({ ...EMPTY_SPEAK_STATS }),
    }),
    {
      name: "deutsch-learner:speak",
      version: 1,
      skipHydration: true, // call useSpeakStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ speakPassed: s.speakPassed }),
    },
  ),
);
