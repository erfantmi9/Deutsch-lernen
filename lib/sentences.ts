import raw from "../data/sentences/a1.json";
import { SentenceListSchema } from "./schemas/sentence";
import { GRAMMAR_FOCI } from "../types/sentence";
import type { GrammarFocus, SentenceExercise } from "../types/sentence";

// Validated once at module load; throws a ZodError on malformed data.
export const sentences: readonly SentenceExercise[] = SentenceListSchema.parse(raw);

const byId: ReadonlyMap<string, SentenceExercise> = new Map(sentences.map((s) => [s.id, s]));

export function getSentence(id: string): SentenceExercise | undefined {
  return byId.get(id);
}

export type FocusFilter = GrammarFocus | "all";

export function filterSentences(focus: FocusFilter = "all"): SentenceExercise[] {
  return focus === "all" ? [...sentences] : sentences.filter((s) => s.grammarFocus === focus);
}

/** Grammar foci that actually have exercises, in a stable display order. */
export function getAvailableFoci(): GrammarFocus[] {
  return GRAMMAR_FOCI.filter((f) => sentences.some((s) => s.grammarFocus === f));
}
