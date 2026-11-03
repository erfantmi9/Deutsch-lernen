import { GAP } from "../types/grammar";
import type { GlossaryEntry } from "../types/grammar";
import { parseRuns } from "./miniMarkdown";
import type { Run } from "./miniMarkdown";

export type Locale = "en" | "fa" | "de";

export interface Segment {
  text: string;
  highlight: boolean;
}

/** Splits `text` so that every occurrence of every pattern is its own highlighted segment. */
export function highlightSegments(text: string, patterns: readonly string[] | undefined): Segment[] {
  if (!patterns || patterns.length === 0 || text.length === 0) return [{ text, highlight: false }];

  const mask = new Array<boolean>(text.length).fill(false);
  for (const p of patterns) {
    if (p.length === 0) continue;
    let from = 0;
    for (;;) {
      const at = text.indexOf(p, from);
      if (at === -1) break;
      for (let i = at; i < at + p.length; i++) mask[i] = true;
      from = at + 1;
    }
  }

  const out: Segment[] = [];
  let start = 0;
  for (let i = 1; i <= text.length; i++) {
    if (i === text.length || mask[i] !== mask[start]) {
      out.push({ text: text.slice(start, i), highlight: mask[start] });
      start = i;
    }
  }
  return out;
}

/** Splits an exercise sentence at its (single) gap. */
export function splitAtGap(sentence: string): { before: string; after: string } {
  const at = sentence.indexOf(GAP);
  if (at === -1) return { before: sentence, after: "" };
  return { before: sentence.slice(0, at), after: sentence.slice(at + GAP.length) };
}

export function fillGap(sentence: string, answer: string): string {
  const { before, after } = splitAtGap(sentence);
  return sentence.includes(GAP) ? `${before}${answer}${after}` : sentence;
}

export const GLOSS_PREFIX = "gloss:";

export type TableCell =
  | { kind: "gloss"; term: string }
  | { kind: "text"; runs: Run[] };

/** `gloss:<term>` → glossary reference; anything else is German text with optional **bold** parts. */
export function parseCell(cell: string): TableCell {
  if (cell.startsWith(GLOSS_PREFIX)) return { kind: "gloss", term: cell.slice(GLOSS_PREFIX.length).trim() };
  return { kind: "text", runs: parseRuns(cell) };
}

export function glossaryMap(entries: readonly GlossaryEntry[]): ReadonlyMap<string, GlossaryEntry> {
  return new Map(entries.map((e) => [e.term, e]));
}

/** The term in the reader's language, and the German term to show beside it (null when already German). */
export function glossLabel(
  entry: GlossaryEntry,
  locale: Locale,
): { label: string; german: string | null } {
  if (locale === "de") return { label: entry.de, german: null };
  return { label: entry[locale], german: entry.de };
}
