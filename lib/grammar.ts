import lessonsRaw from "../data/grammar/lessons.json";
import glossaryRaw from "../data/glossary.json";
import pronounsRaw from "../data/grammar/exercises/pronouns.json";
import nomAkkRaw from "../data/grammar/exercises/nom-akk.json";
import possessivesRaw from "../data/grammar/exercises/possessives.json";
import negationRaw from "../data/grammar/exercises/negation.json";
import pluralRaw from "../data/grammar/exercises/plural.json";
import prepositionLessonsRaw from "../data/grammar/lessons-prepositions-questions.json";
import verbLessonsRaw from "../data/grammar/lessons-verbs-wordorder.json";
import dativeRaw from "../data/grammar/exercises/dative.json";
import wechselRaw from "../data/grammar/exercises/wechsel.json";
import questionsRaw from "../data/grammar/exercises/questions.json";
import imperativeRaw from "../data/grammar/exercises/imperative.json";
import modalRaw from "../data/grammar/exercises/modal.json";
import wordOrderRaw from "../data/grammar/exercises/word-order.json";
import {
  GlossaryListSchema,
  GrammarExerciseListSchema,
  GrammarLessonListSchema,
} from "./schemas/grammar";
import type { GlossaryEntry, GrammarExercise, GrammarLesson } from "../types/grammar";

// Validated once at module load; throws a ZodError on malformed data.
export const grammarLessons: readonly GrammarLesson[] = [
  ...GrammarLessonListSchema.parse([...lessonsRaw, ...prepositionLessonsRaw, ...verbLessonsRaw]),
].sort((a, b) => a.order - b.order);

export const grammarExercises: readonly GrammarExercise[] = GrammarExerciseListSchema.parse([
  ...pronounsRaw,
  ...nomAkkRaw,
  ...possessivesRaw,
  ...negationRaw,
  ...pluralRaw,
  ...dativeRaw,
  ...wechselRaw,
  ...questionsRaw,
  ...imperativeRaw,
  ...modalRaw,
  ...wordOrderRaw,
]);

export const glossary: readonly GlossaryEntry[] = GlossaryListSchema.parse(glossaryRaw);

const lessonById: ReadonlyMap<string, GrammarLesson> = new Map(grammarLessons.map((l) => [l.id, l]));
const exerciseById: ReadonlyMap<string, GrammarExercise> = new Map(grammarExercises.map((e) => [e.id, e]));

export function getLesson(id: string): GrammarLesson | undefined {
  return lessonById.get(id);
}

export function getExercise(id: string): GrammarExercise | undefined {
  return exerciseById.get(id);
}

/** Exercises of a lesson in the order given by `lesson.exerciseIds`. */
export function getLessonExercises(lesson: GrammarLesson): GrammarExercise[] {
  return lesson.exerciseIds.flatMap((id) => {
    const e = exerciseById.get(id);
    return e ? [e] : [];
  });
}

/** Previous and next lesson in course order (null at the ends). */
export function getNeighbours(id: string): { prev: GrammarLesson | null; next: GrammarLesson | null } {
  const i = grammarLessons.findIndex((l) => l.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: grammarLessons[i - 1] ?? null, next: grammarLessons[i + 1] ?? null };
}
