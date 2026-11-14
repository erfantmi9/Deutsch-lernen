import type { SoundContrast } from "../types/listening";

/** Listening progress, kept pure so it can be tested without the store. */

export interface SoundScore {
  right: number;
  total: number;
}

export interface ListenStats {
  /** Dictation sentences written without a mistake (small slips allowed). */
  dictationPassed: string[];
  /** Listening messages answered right at least once. */
  messagesSolved: string[];
  /** Answers per sound contrast. */
  sounds: Partial<Record<SoundContrast, SoundScore>>;
}

export const EMPTY_LISTEN_STATS: ListenStats = { dictationPassed: [], messagesSolved: [], sounds: {} };

const addUnique = (list: readonly string[], id: string): string[] => (list.includes(id) ? [...list] : [...list, id]);

export function applyDictation(s: ListenStats, id: string, passed: boolean): ListenStats {
  return passed ? { ...s, dictationPassed: addUnique(s.dictationPassed, id) } : s;
}

export function applyMessage(s: ListenStats, id: string, correct: boolean): ListenStats {
  return correct ? { ...s, messagesSolved: addUnique(s.messagesSolved, id) } : s;
}

export function applySound(s: ListenStats, contrast: SoundContrast, correct: boolean): ListenStats {
  const prev = s.sounds[contrast] ?? { right: 0, total: 0 };
  return { ...s, sounds: { ...s.sounds, [contrast]: { right: prev.right + (correct ? 1 : 0), total: prev.total + 1 } } };
}

/** Share of right answers for a contrast, or null before MIN_SOUND_ANSWERS answers. */
export const MIN_SOUND_ANSWERS = 4;
export function soundAccuracy(score: SoundScore | undefined): number | null {
  return score && score.total >= MIN_SOUND_ANSWERS ? score.right / score.total : null;
}
