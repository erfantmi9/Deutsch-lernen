import { sentenceParts } from "../dictation";
import type { DictationSentence } from "../dictation";
import type { Dialogue } from "../../types/dialogue";
import type { ListeningMessage, MinimalPair } from "../../types/listening";
import { CHARACTER_VOICES, DICTATION_VOICES, MESSAGE_VOICES, PAIR_VOICES, sameVoice } from "./voices";
import type { VoiceSpec } from "./voices";

/**
 * The recordings the listening exercises use, each with a stable key. The generator turns each into an MP3; the app
 * looks the key up in data/audio/manifest.json and falls back to the browser's speech when it is missing.
 */

export interface ClipJob {
  key: string;
  text: string;
  voice: VoiceSpec;
}

export const clipKey = {
  dialogueLine: (dialogueId: string, line: number) => `dialogue:${dialogueId}:${line}`,
  messageLine: (messageId: string, line: number) => `message:${messageId}:${line}`,
  dictation: (sentenceId: string) => `dictation:${sentenceId}`,
  dictationPart: (sentenceId: string, part: number) => `dictation:${sentenceId}:part:${part}`,
  pairWord: (pairId: string, side: "a" | "b", voice: "f" | "m") => `pair:${pairId}:${side}:${voice}`,
};

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function missingVoices(dialogues: readonly Dialogue[], messages: readonly ListeningMessage[]): string[] {
  const out: string[] = [];
  for (const d of dialogues) for (const l of d.lines) if (!CHARACTER_VOICES[l.speaker]) out.push(`speaker "${l.speaker}" (${d.id})`);
  for (const m of messages) {
    const v = MESSAGE_VOICES[m.id];
    if (!v) out.push(`message ${m.id}`);
    else if (m.lines.some((l) => !v[l.speaker])) out.push(`message ${m.id} speaker 1`);
  }
  return [...new Set(out)];
}

/** Conversations whose two people would get the same voice. */
export function voiceClashes(dialogues: readonly Dialogue[], messages: readonly ListeningMessage[]): string[] {
  const out: string[] = [];
  for (const d of dialogues) {
    const names = [...new Set(d.lines.map((l) => l.speaker))];
    const [a, b] = names.map((n) => CHARACTER_VOICES[n]);
    if (a && b && sameVoice(a, b)) out.push(`dialogue ${d.id}: ${names.join(" and ")} have the same voice`);
  }
  for (const m of messages) {
    const v = MESSAGE_VOICES[m.id];
    if (v?.length === 2 && sameVoice(v[0], v[1])) out.push(`message ${m.id}: both speakers have the same voice`);
  }
  return out;
}

/** The voice of a dictation sentence: the voice of the line it comes from, else one of DICTATION_VOICES. */
function dictationVoice(s: DictationSentence, dialogues: readonly Dialogue[], messages: readonly ListeningMessage[]): VoiceSpec {
  const [kind, id, line] = s.id.split(":");
  if (kind === "d") {
    const speaker = dialogues.find((d) => d.id === id)?.lines[Number(line)]?.speaker;
    if (speaker && CHARACTER_VOICES[speaker]) return CHARACTER_VOICES[speaker];
  }
  if (kind === "m") {
    const msg = messages.find((m) => m.id === id);
    const v = msg ? MESSAGE_VOICES[msg.id]?.[msg.lines[Number(line)]?.speaker ?? 0] : undefined;
    if (v) return v;
  }
  return DICTATION_VOICES[hash(s.id) % DICTATION_VOICES.length];
}

export function clipJobs(input: {
  dialogues: readonly Dialogue[];
  messages: readonly ListeningMessage[];
  dictation: readonly DictationSentence[];
  pairs: readonly MinimalPair[];
}): ClipJob[] {
  const jobs: ClipJob[] = [];
  for (const d of input.dialogues) {
    d.lines.forEach((l, i) => {
      const voice = CHARACTER_VOICES[l.speaker];
      if (voice) jobs.push({ key: clipKey.dialogueLine(d.id, i), text: l.de, voice });
    });
  }
  for (const m of input.messages) {
    m.lines.forEach((l, i) => {
      const voice = MESSAGE_VOICES[m.id]?.[l.speaker];
      if (voice) jobs.push({ key: clipKey.messageLine(m.id, i), text: l.de, voice });
    });
  }
  for (const s of input.dictation) {
    const voice = dictationVoice(s, input.dialogues, input.messages);
    jobs.push({ key: clipKey.dictation(s.id), text: s.de, voice });
    const parts = sentenceParts(s.de);
    if (parts.length > 1) parts.forEach((p, i) => jobs.push({ key: clipKey.dictationPart(s.id, i), text: p, voice }));
  }
  for (const p of input.pairs) {
    for (const side of ["a", "b"] as const) {
      for (const v of ["f", "m"] as const) {
        jobs.push({ key: clipKey.pairWord(p.id, side, v), text: p[side].de, voice: PAIR_VOICES[v] });
      }
    }
  }
  return jobs;
}
