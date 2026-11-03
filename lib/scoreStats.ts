/** Best-score bookkeeping shared by the dialogue quizzes and the reading tasks. */

export interface ScoreResult {
  best: number;
  attempts: number;
}

export type ScoreMap = Readonly<Record<string, ScoreResult>>;

/** Both the dialogue quiz and the reading text have four questions; three right counts as passed. */
export const PASS_MARK = 3;

export function applyScore(map: ScoreMap, id: string, score: number): ScoreMap {
  const prev = map[id] ?? { best: 0, attempts: 0 };
  return { ...map, [id]: { best: Math.max(prev.best, score), attempts: prev.attempts + 1 } };
}

export function bestScore(map: ScoreMap, id: string): number | null {
  return map[id]?.best ?? null;
}

export function isPassed(map: ScoreMap, id: string, passMark: number = PASS_MARK): boolean {
  return (map[id]?.best ?? 0) >= passMark;
}

/** Share of the given ids that have been passed (0-1). */
export function passedFraction(ids: readonly string[], map: ScoreMap, passMark: number = PASS_MARK): number {
  return ids.length === 0 ? 0 : ids.filter((id) => isPassed(map, id, passMark)).length / ids.length;
}

export function addUnique(list: readonly string[], id: string): string[] {
  return list.includes(id) ? [...list] : [...list, id];
}
