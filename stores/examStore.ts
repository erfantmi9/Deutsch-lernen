import { create } from "zustand";
import { persist } from "zustand/middleware";
import { dateKey } from "@/lib/dateKey";
import { addAttempt, MAX_ATTEMPTS_KEPT, totalPoints } from "@/lib/exam";
import type { ExamAttempt } from "@/lib/exam";
import { EXAM_MODULES } from "@/types/exam";
import { recordActivity } from "./activityStore";

interface ExamState {
  /** Newest first, at most MAX_ATTEMPTS_KEPT. Only complete four-part attempts are stored. */
  attempts: ExamAttempt[];
  recordAttempt: (scores: ExamAttempt["scores"]) => void;
  reset: () => void;
}

const isAttempt = (v: unknown): v is ExamAttempt => {
  if (typeof v !== "object" || v === null) return false;
  const a = v as ExamAttempt;
  return (
    typeof a.date === "string" &&
    typeof a.total === "number" &&
    typeof a.scores === "object" &&
    a.scores !== null &&
    EXAM_MODULES.every((m) => typeof a.scores[m] === "number")
  );
};

export const useExamStore = create<ExamState>()(
  persist(
    (set) => ({
      attempts: [],
      recordAttempt: (scores) => {
        set((s) => ({ attempts: addAttempt(s.attempts, { date: dateKey(), scores, total: totalPoints(scores) }) }));
        recordActivity(10);
      },
      reset: () => set({ attempts: [] }),
    }),
    {
      name: "deutsch-learner:exam",
      version: 1,
      skipHydration: true, // call useExamStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({ attempts: s.attempts }),
      migrate: (persisted) => {
        const raw = (persisted as { attempts?: unknown } | null)?.attempts;
        return { attempts: Array.isArray(raw) ? raw.filter(isAttempt).slice(0, MAX_ATTEMPTS_KEPT) : [] };
      },
    },
  ),
);
