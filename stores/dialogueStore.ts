import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { addUnique, applyScore } from "@/lib/scoreStats";
import type { ScoreMap } from "@/lib/scoreStats";

interface DialogueState {
  /** Best comprehension-quiz score per dialogue. */
  results: ScoreMap;
  /** Dialogues whose role-play was played to the end. */
  rolePlayDone: string[];
  recordQuiz: (dialogueId: string, score: number) => void;
  recordRolePlay: (dialogueId: string) => void;
  reset: () => void;
}

export const useDialogueStore = create<DialogueState>()(
  persist(
    (set) => ({
      results: {},
      rolePlayDone: [],
      recordQuiz: (dialogueId, score) => {
        set((s) => ({ results: applyScore(s.results, dialogueId, score) }));
        recordActivity(4);
      },
      recordRolePlay: (dialogueId) => {
        set((s) => ({ rolePlayDone: addUnique(s.rolePlayDone, dialogueId) }));
        recordActivity(4);
      },
      reset: () => set({ results: {}, rolePlayDone: [] }),
    }),
    {
      name: "deutsch-learner:dialogues",
      version: 1,
      skipHydration: true, // call useDialogueStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ results: s.results, rolePlayDone: s.rolePlayDone }),
    },
  ),
);
