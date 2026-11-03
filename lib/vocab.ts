import { vocab } from "../data/vocab";
import type { VocabCategory, VocabEntry } from "../types/vocab";

export { vocab };

export const vocabById: ReadonlyMap<string, VocabEntry> = new Map(vocab.map((w) => [w.id, w]));

export function getVocabByCategory(category: VocabCategory): VocabEntry[] {
  return vocab.filter((w) => w.category === category);
}
