import { create } from "zustand";
import { persist } from "zustand/middleware";
import { recordActivity } from "./activityStore";
import { vocab } from "@/lib/vocab";
import type { Article, VocabEntry } from "@/types/vocab";

export interface LastAnswer {
  wordId: string;
  chosen: Article;
  correct: boolean;
}

interface QuizState {
  currentWord: VocabEntry | null;
  score: number;
  streak: number;
  bestStreak: number;
  lastAnswer: LastAnswer | null;
  wrongWordIds: string[];
  answer: (article: Article) => void;
  next: () => void;
  reset: () => void;
}

const WRONG_WEIGHT = 4;

/** Weighted random pick. Words answered wrongly are WRONG_WEIGHT times likelier. Never repeats `excludeId`. */
export function pickWord(
  excludeId: string | null,
  wrongIds: readonly string[],
  rng: () => number = Math.random,
): VocabEntry {
  const pool = vocab.length > 1 ? vocab.filter((w) => w.id !== excludeId) : vocab;
  const weights = pool.map((w) => (wrongIds.includes(w.id) ? WRONG_WEIGHT : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set, get) => ({
      currentWord: null,
      score: 0,
      streak: 0,
      bestStreak: 0,
      lastAnswer: null,
      wrongWordIds: [],

      answer: (article) => {
        const { currentWord, lastAnswer, streak, bestStreak, score, wrongWordIds } = get();
        if (!currentWord) return;
        if (lastAnswer && lastAnswer.wordId === currentWord.id) return; // already answered

        const correct = article === currentWord.article;
        const newStreak = correct ? streak + 1 : 0;
        set({
          lastAnswer: { wordId: currentWord.id, chosen: article, correct },
          score: correct ? score + 1 : score,
          streak: newStreak,
          bestStreak: Math.max(bestStreak, newStreak),
          wrongWordIds: correct
            ? wrongWordIds.filter((id) => id !== currentWord.id)
            : wrongWordIds.includes(currentWord.id)
              ? wrongWordIds
              : [...wrongWordIds, currentWord.id],
        });
        recordActivity();
      },

      next: () => {
        const { currentWord, wrongWordIds } = get();
        set({
          currentWord: pickWord(currentWord?.id ?? null, wrongWordIds),
          lastAnswer: null,
        });
      },

      reset: () => {
        set({
          score: 0,
          streak: 0,
          bestStreak: 0,
          wrongWordIds: [],
          lastAnswer: null,
          currentWord: pickWord(get().currentWord?.id ?? null, []),
        });
      },
    }),
    {
      name: "deutsch-learner:quiz",
      version: 1,
      skipHydration: true, // call useQuizStore.persist.rehydrate() on the client after mount
      partialize: (s) => ({
        score: s.score,
        streak: s.streak,
        bestStreak: s.bestStreak,
        wrongWordIds: s.wrongWordIds,
      }),
    },
  ),
);
