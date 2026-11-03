import { GLOSS_PREFIX } from "../grammarText";
import type { GlossaryEntry, GrammarExercise, GrammarLesson } from "../../types/grammar";
import type { Problem } from "./rules";

export const MIN_EXERCISES_PER_LESSON = 8;
export const MIN_EXAMPLES_PER_LESSON = 4;
export const MIN_SECTIONS = 2;
export const MAX_SECTIONS = 3;

export interface IdProblem {
  /** `lesson:<id>` or `exercise:<id>` */
  id: string;
  problem: Problem;
}

const err = (message: string): Problem => ({ severity: "error", message });
const warn = (message: string): Problem => ({ severity: "warning", message });

const norm = (s: string): string => s.normalize("NFC").trim().toLowerCase();

/** Cross-reference and content checks for the grammar data set (structure is checked by the zod schemas). */
export function checkGrammarData(
  lessons: readonly GrammarLesson[],
  exercises: readonly GrammarExercise[],
  glossary: readonly GlossaryEntry[],
): IdProblem[] {
  const out: IdProblem[] = [];
  const add = (id: string, problem: Problem) => out.push({ id, problem });

  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const terms = new Set(glossary.map((g) => g.term));

  for (const lesson of lessons) {
    const id = `lesson:${lesson.id}`;

    if (lesson.sections.length < MIN_SECTIONS || lesson.sections.length > MAX_SECTIONS) {
      add(id, err(`needs ${MIN_SECTIONS}-${MAX_SECTIONS} sections (has ${lesson.sections.length})`));
    }
    if (lesson.examples.length < MIN_EXAMPLES_PER_LESSON) {
      add(id, err(`needs at least ${MIN_EXAMPLES_PER_LESSON} examples (has ${lesson.examples.length})`));
    }
    if (lesson.exerciseIds.length < MIN_EXERCISES_PER_LESSON) {
      add(id, err(`needs at least ${MIN_EXERCISES_PER_LESSON} exercises (has ${lesson.exerciseIds.length})`));
    }

    const seenIds = new Set<string>();
    for (const eid of lesson.exerciseIds) {
      if (seenIds.has(eid)) add(id, err(`exerciseIds lists "${eid}" twice`));
      seenIds.add(eid);
      const ex = exerciseById.get(eid);
      if (!ex) add(id, err(`exerciseIds references unknown exercise "${eid}"`));
      else if (ex.lessonId !== lesson.id) add(id, err(`exercise "${eid}" belongs to lesson "${ex.lessonId}"`));
    }

    lesson.sections.forEach((section, i) => {
      const table = section.table;
      if (!table) return;
      for (const cell of [...table.headers, ...table.rows.flat()]) {
        if (cell.startsWith(GLOSS_PREFIX)) {
          const term = cell.slice(GLOSS_PREFIX.length).trim();
          if (!terms.has(term)) add(id, err(`sections[${i}].table uses unknown glossary term "${term}"`));
        }
      }
    });

    lesson.examples.forEach((ex, i) => {
      for (const h of ex.highlight ?? []) {
        if (!ex.de.includes(h)) add(id, err(`examples[${i}] highlight "${h}" does not occur in "${ex.de}"`));
      }
    });
  }

  for (const ex of exercises) {
    const id = `exercise:${ex.id}`;
    const lesson = lessonById.get(ex.lessonId);
    if (!lesson) add(id, err(`unknown lessonId "${ex.lessonId}"`));
    else if (!lesson.exerciseIds.includes(ex.id)) add(id, err(`not listed in exerciseIds of lesson "${ex.lessonId}"`));

    if (ex.options) {
      const normalized = ex.options.map(norm);
      if (new Set(normalized).size !== normalized.length) add(id, err("options contain duplicates (case-insensitive)"));
      if (ex.type !== "choice") add(id, warn(`type is "${ex.type}" but options are given (they are ignored)`));
    }
    if (ex.acceptedAnswers?.some((a) => norm(a) === norm(ex.answer))) {
      add(id, warn("acceptedAnswers repeats the main answer"));
    }
  }

  return out;
}
