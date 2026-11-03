import { shuffled } from "./shuffle";
import type { Rng } from "./shuffle";

/** Lines shorter than this are too generic ("Danke!") to serve as wrong answers. */
export const MIN_DISTRACTOR_WORDS = 3;

export interface RolePlayLine {
  speaker: string;
  de: string;
}

export interface PoolSource {
  id: string;
  topic: string;
  lines: readonly { de: string }[];
}

const words = (s: string): number => s.trim().split(/\s+/u).filter(Boolean).length;

export const isQuestionLine = (s: string): boolean => s.trim().endsWith("?");

/** The two speakers in order of first appearance. */
export function speakersOf(lines: readonly { speaker: string }[]): string[] {
  return [...new Set(lines.map((l) => l.speaker))];
}

/**
 * Wrong answers for the role-play come from dialogues about a different topic, so they never fit by accident.
 */
export function distractorPool(all: readonly PoolSource[], current: { id: string; topic: string }): string[] {
  const out = new Set<string>();
  for (const d of all) {
    if (d.id === current.id || d.topic === current.topic) continue;
    for (const line of d.lines) {
      if (words(line.de) >= MIN_DISTRACTOR_WORDS) out.add(line.de.trim());
    }
  }
  return [...out];
}

/** The correct reply plus `count - 1` distractors of the same kind (question or statement), in random order. */
export function buildChoices(correct: string, pool: readonly string[], rng: Rng, count = 3): string[] {
  const candidates = pool.filter((p) => p !== correct);
  const sameKind = candidates.filter((p) => isQuestionLine(p) === isQuestionLine(correct));
  const picked = shuffled(sameKind, rng).slice(0, count - 1);
  if (picked.length < count - 1) {
    const rest = shuffled(
      candidates.filter((p) => !picked.includes(p)),
      rng,
    );
    picked.push(...rest.slice(0, count - 1 - picked.length));
  }
  return shuffled([correct, ...picked], rng);
}

/** Choices for every line the learner has to answer, keyed by line index. */
export function buildRolePlayChoices(
  lines: readonly RolePlayLine[],
  role: string,
  pool: readonly string[],
  rng: Rng,
): Record<number, string[]> {
  const out: Record<number, string[]> = {};
  lines.forEach((line, i) => {
    if (line.speaker === role) out[i] = buildChoices(line.de, pool, rng);
  });
  return out;
}
