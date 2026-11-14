import { clipKey } from "./clips";
import { clipSrc } from "./manifest";
import { sentenceParts } from "../dictation";
import type { DictationSentence } from "../dictation";
import type { Dialogue } from "../../types/dialogue";
import type { ListeningMessage, MinimalPair } from "../../types/listening";

/** Server side: the recordings each listening page needs, as plain props. `null` = not recorded, use the browser voice. */

export interface PairAudio {
  a: { f: string | null; m: string | null };
  b: { f: string | null; m: string | null };
}

export const dialogueAudio = (d: Dialogue): (string | null)[] => d.lines.map((_, i) => clipSrc(clipKey.dialogueLine(d.id, i)));

export const messageAudio = (m: ListeningMessage): (string | null)[] => m.lines.map((_, i) => clipSrc(clipKey.messageLine(m.id, i)));

export interface DictationAudio {
  src: string | null;
  parts: (string | null)[];
}

export function dictationAudio(s: DictationSentence): DictationAudio {
  const parts = sentenceParts(s.de);
  return { src: clipSrc(clipKey.dictation(s.id)), parts: parts.length > 1 ? parts.map((_, i) => clipSrc(clipKey.dictationPart(s.id, i))) : [] };
}

export function pairAudio(p: MinimalPair): PairAudio {
  const side = (s: "a" | "b") => ({ f: clipSrc(clipKey.pairWord(p.id, s, "f")), m: clipSrc(clipKey.pairWord(p.id, s, "m")) });
  return { a: side("a"), b: side("b") };
}

/**
 * Recordings for the background murmur (several people talking at once in a café, a shop, a station). Taken from
 * dialogues, so the learner hears real German around the voice they have to follow. Excludes the given text's own clips.
 */
export function babblePool(dialogues: readonly Dialogue[], exclude: readonly (string | null)[] = [], size = 16): string[] {
  const skip = new Set(exclude);
  const all = dialogues.flatMap((d) => dialogueAudio(d)).filter((s): s is string => s !== null && !skip.has(s));
  // Every n-th clip: varied speakers, the same list on every build.
  const step = Math.max(1, Math.floor(all.length / size));
  return all.filter((_, i) => i % step === 0).slice(0, size);
}
