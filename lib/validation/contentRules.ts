import type { Dialogue } from "../../types/dialogue";
import { MAX_TEXT_WORDS, MIN_TEXT_WORDS, READING_KINDS } from "../../types/reading";
import type { ReadingText } from "../../types/reading";
import type { Problem } from "./rules";

/** Cross-reference and content checks for dialogues and reading texts (structure is checked by zod). */

export interface IdProblem {
  id: string;
  problem: Problem;
}

const err = (message: string): Problem => ({ severity: "error", message });
const warn = (message: string): Problem => ({ severity: "warning", message });

export interface KnownIds {
  nounIds: ReadonlySet<string>;
  verbIds: ReadonlySet<string>;
  lessonIds: ReadonlySet<string>;
}

export const wordCount = (text: string): number => text.trim().split(/\s+/u).filter(Boolean).length;

/** Collapses all whitespace so evidence may span a line break. */
export const squash = (text: string): string => text.replace(/\s+/gu, " ").trim();

export function checkDialogues(dialogues: readonly Dialogue[], known: KnownIds): IdProblem[] {
  const out: IdProblem[] = [];
  for (const d of dialogues) {
    const id = `dialogue:${d.id}`;
    const add = (problem: Problem) => out.push({ id, problem });

    for (const v of d.vocabIds ?? []) {
      const m = /^(noun|verb):(.+)$/u.exec(v);
      if (!m) add(err(`vocabId "${v}" must look like noun:<id> or verb:<id>`));
      else if (m[1] === "noun" && !known.nounIds.has(m[2])) add(err(`unknown noun "${m[2]}" in vocabIds`));
      else if (m[1] === "verb" && !known.verbIds.has(m[2])) add(err(`unknown verb "${m[2]}" in vocabIds`));
    }
    if (new Set(d.vocabIds ?? []).size !== (d.vocabIds ?? []).length) add(err("vocabIds contains duplicates"));

    for (const g of d.grammarLessonIds ?? []) {
      if (!known.lessonIds.has(g)) add(err(`unknown grammar lesson "${g}"`));
    }

    d.lines.forEach((line, i) => {
      if (!/[.!?]["”]?$/u.test(line.de.trim())) add(warn(`lines[${i}].de does not end with punctuation`));
      if (i > 0 && d.lines[i - 1].speaker === line.speaker) add(warn(`lines[${i}] has the same speaker as the line before`));
    });

    const texts = d.lines.map((l) => l.de.trim());
    if (new Set(texts).size !== texts.length) add(warn("a line is repeated"));
  }
  return out;
}

export function checkReadingTexts(texts: readonly ReadingText[]): IdProblem[] {
  const out: IdProblem[] = [];
  const taskIds = new Map<string, string>();

  for (const t of texts) {
    const id = `reading:${t.id}`;
    const add = (problem: Problem) => out.push({ id, problem });
    const body = squash(t.text);

    const words = wordCount(t.text);
    if (words < MIN_TEXT_WORDS || words > MAX_TEXT_WORDS) {
      add(err(`text has ${words} words, expected ${MIN_TEXT_WORDS}-${MAX_TEXT_WORDS}`));
    }

    for (const task of t.tasks) {
      const first = taskIds.get(task.id);
      if (first) add(err(`task id "${task.id}" is also used in "${first}"`));
      taskIds.set(task.id, t.id);

      if (task.type !== "matching" && !body.includes(squash(task.evidence))) {
        add(err(`task ${task.id}: evidence "${task.evidence}" does not occur in the text`));
      }
    }

    if (!t.tasks.some((task) => task.type === "matching")) add(warn("has no matching task"));
    if (!t.tasks.some((task) => task.type === "true-false")) add(warn("has no true/false task"));
  }

  const kinds = new Set(texts.map((t) => t.kind));
  for (const kind of READING_KINDS) {
    if (!kinds.has(kind)) out.push({ id: "reading", problem: warn(`no text of kind "${kind}"`) });
  }
  return out;
}
