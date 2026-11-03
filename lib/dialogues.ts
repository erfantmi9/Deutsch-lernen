import a1 from "../data/dialogues/a1.json";
import a1b from "../data/dialogues/a1-b.json";
import { DialogueListSchema } from "./schemas/dialogue";
import { getVerb, verbs } from "./verbs";
import { vocab, vocabById } from "./vocab";
import { annotate, buildWordIndex } from "./wordLookup";
import type { AnnotatedToken } from "./wordLookup";
import { distractorPool } from "./rolePlay";
import type { Dialogue, DialogueLine } from "../types/dialogue";

/** Server-side loader. Client components receive plain props from the pages, so none of this data reaches the browser twice. */

// Validated once at module load; throws a ZodError on malformed data.
export const dialogues: readonly Dialogue[] = DialogueListSchema.parse([...a1, ...a1b]);

const byId: ReadonlyMap<string, Dialogue> = new Map(dialogues.map((d) => [d.id, d]));

export function getDialogue(id: string): Dialogue | undefined {
  return byId.get(id);
}

export function getDialogueNeighbours(id: string): { prev: Dialogue | null; next: Dialogue | null } {
  const i = dialogues.findIndex((d) => d.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: dialogues[i - 1] ?? null, next: dialogues[i + 1] ?? null };
}

const wordIndex = buildWordIndex(vocab, verbs);

export interface AnnotatedLine extends DialogueLine {
  tokens: AnnotatedToken[];
}

/** Every line with its German words looked up in the vocabulary. */
export function annotateLines(d: Dialogue): AnnotatedLine[] {
  return d.lines.map((line) => ({ ...line, tokens: annotate(wordIndex, line.de) }));
}

export function dialogueDistractors(d: Dialogue): string[] {
  return distractorPool(dialogues, d);
}

export interface ResolvedWord {
  id: string;
  display: string;
  translations: { en: string; fa: string };
}

/** `noun:<id>` / `verb:<id>` entries resolved to something displayable. Unknown ids are skipped. */
export function resolveVocabIds(ids: readonly string[] | undefined): ResolvedWord[] {
  const out: ResolvedWord[] = [];
  for (const raw of ids ?? []) {
    const [kind, id] = raw.split(":");
    if (kind === "noun") {
      const n = vocabById.get(id);
      if (n) out.push({ id: raw, display: `${n.article} ${n.word}`, translations: n.translations });
    } else if (kind === "verb") {
      const v = getVerb(id);
      if (v) out.push({ id: raw, display: v.infinitive, translations: v.translations });
    }
  }
  return out;
}
