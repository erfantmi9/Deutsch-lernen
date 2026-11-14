import messagesRaw from "../data/listening/messages.json";
import soundsRaw from "../data/listening/sounds.json";
import { ListeningMessageListSchema, MinimalPairListSchema } from "./schemas/listening";
import { dialogues } from "./dialogues";
import { sentences } from "./sentences";
import { isDictatable } from "./dictation";
import type { DictationSentence } from "./dictation";
import type { ListeningMessage, MinimalPair } from "../types/listening";

/** Server-side loader for the listening section. Client components receive plain props from the pages. */

// Validated once at module load; throws a ZodError on malformed data.
export const listeningMessages: readonly ListeningMessage[] = ListeningMessageListSchema.parse(messagesRaw);
export const minimalPairs: readonly MinimalPair[] = MinimalPairListSchema.parse(soundsRaw);

/**
 * Sentences for dictation: every dialogue line, listening-message line and word-order sentence that can be dictated fairly
 * (see isDictatable), each once.
 */
export function dictationPool(): DictationSentence[] {
  const out: DictationSentence[] = [];
  const seen = new Set<string>();
  const add = (s: DictationSentence) => {
    const key = s.de.trim().toLowerCase();
    if (seen.has(key) || !isDictatable(s.de)) return;
    seen.add(key);
    out.push(s);
  };
  for (const d of dialogues) {
    d.lines.forEach((l, i) => add({ id: `d:${d.id}:${i}`, de: l.de, translation: { en: l.en, fa: l.fa } }));
  }
  for (const m of listeningMessages) {
    m.lines.forEach((l, i) => add({ id: `m:${m.id}:${i}`, de: l.de, translation: { en: l.en, fa: l.fa } }));
  }
  for (const s of sentences) add({ id: `s:${s.id}`, de: s.tokens.join(" "), translation: s.translations });
  return out;
}
