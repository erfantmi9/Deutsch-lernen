import type { SentenceExercise, SentenceRole } from "../types/sentence";
import { normalizeToken } from "./validation/rules";

/* ---------- board model (word bank + answer line) ---------- */

export interface Chip {
  id: string;
  text: string;
  role?: SentenceRole;
  distractor: boolean;
  /** Fixed slot in the word bank, so a chip returns to the same place. */
  order: number;
}

export interface Board {
  bank: Chip[];
  answer: Chip[];
}

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function baseChips(ex: SentenceExercise): Omit<Chip, "order">[] {
  const words = ex.tokens.map((text, i) => ({
    id: `t${i}`,
    text,
    role: ex.roles?.[i],
    distractor: false,
  }));
  const extras = (ex.distractors ?? []).map((text, i) => ({ id: `d${i}`, text, distractor: true }));
  return [...words, ...extras];
}

/** All words (plus distractors) in the word bank, shuffled so the bank never already shows the solution. */
export function initialBoard(ex: SentenceExercise, rng: () => number = Math.random): Board {
  const chips = baseChips(ex);
  const solution = ex.tokens.map(normalizeToken).join(" ");
  let shuffled = shuffle(chips, rng);
  for (let tries = 0; tries < 10; tries++) {
    const onlyWords = shuffled.filter((c) => !c.distractor).map((c) => normalizeToken(c.text)).join(" ");
    if (chips.length < 2 || onlyWords !== solution) break;
    shuffled = shuffle(chips, rng);
  }
  return { bank: shuffled.map((c, order) => ({ ...c, order })), answer: [] };
}

export function addToAnswer(board: Board, id: string, index?: number): Board {
  const chip = board.bank.find((c) => c.id === id);
  if (!chip) return board;
  const answer = [...board.answer];
  const at = index === undefined ? answer.length : Math.max(0, Math.min(index, answer.length));
  answer.splice(at, 0, chip);
  return { bank: board.bank.filter((c) => c.id !== id), answer };
}

export function removeFromAnswer(board: Board, id: string): Board {
  const chip = board.answer.find((c) => c.id === id);
  if (!chip) return board;
  const bank = [...board.bank, chip].sort((a, b) => a.order - b.order);
  return { bank, answer: board.answer.filter((c) => c.id !== id) };
}

export function reorderAnswer(board: Board, id: string, toIndex: number): Board {
  const from = board.answer.findIndex((c) => c.id === id);
  if (from === -1) return board;
  const to = Math.max(0, Math.min(toIndex, board.answer.length - 1));
  if (from === to) return board;
  const answer = [...board.answer];
  const [chip] = answer.splice(from, 1);
  answer.splice(to, 0, chip);
  return { ...board, answer };
}

export function moveInAnswer(board: Board, id: string, delta: number): Board {
  const from = board.answer.findIndex((c) => c.id === id);
  return from === -1 ? board : reorderAnswer(board, id, from + delta);
}

/* ---------- checking ---------- */

export interface OrderCheck {
  correct: boolean;
  /** Indices (in the learner's answer) that do not match the closest accepted order. */
  wrongPositions: number[];
  /** True when the learner placed fewer words than the sentence has. */
  incomplete: boolean;
}

function mismatches(answer: readonly string[], order: readonly string[]): number[] {
  const wrong: number[] = [];
  answer.forEach((word, i) => {
    if (i >= order.length || normalizeToken(word) !== normalizeToken(order[i])) wrong.push(i);
  });
  return wrong;
}

/** Compares the answer with the main order and every accepted order; reports positions for the closest one. */
export function checkOrder(answer: readonly string[], ex: SentenceExercise): OrderCheck {
  const orders: readonly (readonly string[])[] = [ex.tokens, ...(ex.acceptedOrders ?? [])];
  let best: number[] | null = null;
  let bestOrderLength = ex.tokens.length;
  for (const order of orders) {
    const wrong = mismatches(answer, order);
    if (best === null || wrong.length < best.length) {
      best = wrong;
      bestOrderLength = order.length;
    }
  }
  const wrongPositions = best ?? [];
  const incomplete = answer.length < bestOrderLength;
  return {
    correct: wrongPositions.length === 0 && answer.length === bestOrderLength,
    wrongPositions,
    incomplete,
  };
}

/* ---------- selection and progress ---------- */

export const WRONG_WEIGHT = 4;
export const NEW_WEIGHT = 2;

/** Weighted pick: wrong > never solved > solved. Never repeats `lastId` when there is a choice. */
export function pickSentence(
  pool: readonly SentenceExercise[],
  solvedIds: readonly string[],
  wrongIds: readonly string[],
  lastId: string | null,
  rng: () => number = Math.random,
): SentenceExercise {
  if (pool.length === 0) throw new Error("pickSentence: empty pool");
  const candidates = pool.length > 1 ? pool.filter((s) => s.id !== lastId) : pool;
  const weights = candidates.map((s) =>
    wrongIds.includes(s.id) ? WRONG_WEIGHT : solvedIds.includes(s.id) ? 1 : NEW_WEIGHT,
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export interface SentenceStats {
  solvedIds: string[];
  wrongIds: string[];
  streak: number;
  bestStreak: number;
}

/**
 * `firstAttempt` = the learner's first check of this exercise. Only first attempts change the streak,
 * so retrying until correct marks the sentence solved but cannot farm the streak.
 */
export function applySentenceResult(
  stats: SentenceStats,
  id: string,
  correct: boolean,
  firstAttempt: boolean,
): SentenceStats {
  if (correct) {
    const streak = firstAttempt ? stats.streak + 1 : stats.streak;
    return {
      solvedIds: stats.solvedIds.includes(id) ? stats.solvedIds : [...stats.solvedIds, id],
      wrongIds: stats.wrongIds.filter((w) => w !== id),
      streak,
      bestStreak: Math.max(stats.bestStreak, streak),
    };
  }
  if (!firstAttempt) return stats;
  return {
    ...stats,
    streak: 0,
    wrongIds: stats.wrongIds.includes(id) ? stats.wrongIds : [...stats.wrongIds, id],
  };
}
