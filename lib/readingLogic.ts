import type { ReadingTask } from "../types/reading";
import { PASS_MARK } from "./scoreStats";

/**
 * What the learner answered:
 * - true-false: true / false
 * - choice: the chosen option
 * - matching: option chosen per pair index
 * `null` / `undefined` means not answered yet.
 */
export type TaskResponse = boolean | string | Readonly<Record<number, string>> | null | undefined;

export function isAnswered(task: ReadingTask, response: TaskResponse): boolean {
  switch (task.type) {
    case "true-false":
      return typeof response === "boolean";
    case "choice":
      return typeof response === "string" && response.length > 0;
    default: {
      if (typeof response !== "object" || response === null) return false;
      return task.pairs.every((_, i) => typeof response[i] === "string" && response[i].length > 0);
    }
  }
}

/** Per pair: was it matched correctly? */
export function pairResults(task: Extract<ReadingTask, { type: "matching" }>, response: TaskResponse): boolean[] {
  const given: Readonly<Record<number, string>> = typeof response === "object" && response !== null ? response : {};
  return task.pairs.map((p, i) => given[i] === p.answer);
}

export function checkTask(task: ReadingTask, response: TaskResponse): boolean {
  switch (task.type) {
    case "true-false":
      return typeof response === "boolean" && response === task.answer;
    case "choice":
      return response === task.answer;
    default:
      return pairResults(task, response).every(Boolean);
  }
}

export interface TextScore {
  correct: number;
  total: number;
  perTask: boolean[];
  passed: boolean;
}

export function scoreTasks(tasks: readonly ReadingTask[], responses: readonly TaskResponse[]): TextScore {
  const perTask = tasks.map((t, i) => checkTask(t, responses[i]));
  const correct = perTask.filter(Boolean).length;
  return { correct, total: tasks.length, perTask, passed: correct >= PASS_MARK };
}

export function allTasksAnswered(tasks: readonly ReadingTask[], responses: readonly TaskResponse[]): boolean {
  return tasks.length > 0 && tasks.every((t, i) => isAnswered(t, responses[i]));
}
