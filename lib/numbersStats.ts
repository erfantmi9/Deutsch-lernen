/** Progress bookkeeping for the numbers drills. Pure and free of content data, so the home page can use it cheaply. */

export const NUMBER_DRILL_KINDS = ["cardinal", "reverse", "price", "date", "clock-read", "clock-set"] as const;
export type NumberDrillKind = (typeof NUMBER_DRILL_KINDS)[number];

export interface KindStats {
  attempts: number;
  correct: number;
}

export interface NumbersStats {
  byKind: Record<NumberDrillKind, KindStats>;
  streak: number;
  bestStreak: number;
}

const emptyKinds = (): Record<NumberDrillKind, KindStats> => ({
  cardinal: { attempts: 0, correct: 0 },
  reverse: { attempts: 0, correct: 0 },
  price: { attempts: 0, correct: 0 },
  date: { attempts: 0, correct: 0 },
  "clock-read": { attempts: 0, correct: 0 },
  "clock-set": { attempts: 0, correct: 0 },
});

export const EMPTY_NUMBERS_STATS: NumbersStats = { byKind: emptyKinds(), streak: 0, bestStreak: 0 };

export function applyNumbersResult(stats: NumbersStats, kind: NumberDrillKind, correct: boolean): NumbersStats {
  const prev = stats.byKind[kind] ?? { attempts: 0, correct: 0 };
  const streak = correct ? stats.streak + 1 : 0;
  return {
    byKind: {
      ...emptyKinds(),
      ...stats.byKind,
      [kind]: { attempts: prev.attempts + 1, correct: prev.correct + (correct ? 1 : 0) },
    },
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
  };
}

export function totalCorrect(stats: NumbersStats): number {
  return NUMBER_DRILL_KINDS.reduce((sum, k) => sum + (stats.byKind[k]?.correct ?? 0), 0);
}

/** Share of correct answers for one kind (0 when it was never tried). */
export function accuracy(stats: NumbersStats, kind: NumberDrillKind): number {
  const s = stats.byKind[kind];
  return !s || s.attempts === 0 ? 0 : s.correct / s.attempts;
}

/** 0-1: total correct answers measured against a goal (default 60). */
export function numbersProgress(stats: NumbersStats, goal = 60): number {
  return Math.min(1, totalCorrect(stats) / goal);
}
