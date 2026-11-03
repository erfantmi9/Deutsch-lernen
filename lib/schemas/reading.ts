import { z } from "zod";
import { READING_KINDS, TASKS_PER_TEXT } from "../../types/reading";
import type { ReadingTask, ReadingText } from "../../types/reading";
import { I18n3Schema, TextSchema } from "./common";

const TrueFalseTaskSchema = z.object({
  id: TextSchema,
  type: z.literal("true-false"),
  statement: TextSchema,
  answer: z.boolean(),
  evidence: TextSchema,
});

const ChoiceTaskSchema = z.object({
  id: TextSchema,
  type: z.literal("choice"),
  question: TextSchema,
  options: z.array(TextSchema).length(3),
  answer: TextSchema,
  evidence: TextSchema,
});

const MatchingTaskSchema = z.object({
  id: TextSchema,
  type: z.literal("matching"),
  prompt: I18n3Schema,
  pairs: z.array(z.object({ item: TextSchema, answer: TextSchema })).min(3),
  options: z.array(TextSchema).min(4),
});

/** A discriminated union, so a mistake in one task type reports a precise message. */
export const ReadingTaskSchema = z.discriminatedUnion("type", [TrueFalseTaskSchema, ChoiceTaskSchema, MatchingTaskSchema]);

const lower = (list: readonly string[]): string[] => list.map((s) => s.toLowerCase());

/** Cross-field checks that depend on the task type. */
function refineTask(task: ReadingTask, ctx: z.RefinementCtx, at: (string | number)[]): void {
  const issue = (path: (string | number)[], message: string) =>
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...at, ...path], message });

  if (task.type === "choice") {
    if (!task.options.includes(task.answer)) issue(["answer"], "answer is not one of the options");
    if (new Set(lower(task.options)).size !== task.options.length) issue(["options"], "options contain duplicates");
  }
  if (task.type === "matching") {
    const answers = task.pairs.map((p) => p.answer);
    if (new Set(answers).size !== answers.length) issue(["pairs"], "two items share the same answer");
    if (new Set(task.options).size !== task.options.length) issue(["options"], "options contain duplicates");
    for (const a of answers) {
      if (!task.options.includes(a)) issue(["options"], `answer "${a}" is missing from the options`);
    }
    if (task.options.length <= task.pairs.length) issue(["options"], "needs at least one extra option");
  }
}

export const ReadingTextSchema = z
  .object({
    id: TextSchema,
    kind: z.enum(READING_KINDS),
    title: I18n3Schema,
    text: TextSchema,
    translation: z.object({ en: TextSchema, fa: TextSchema }),
    tasks: z.array(ReadingTaskSchema).length(TASKS_PER_TEXT),
  })
  .superRefine((t, ctx) => t.tasks.forEach((task, i) => refineTask(task, ctx, ["tasks", i]))) satisfies z.ZodType<ReadingText>;

export const ReadingListSchema = z
  .array(ReadingTextSchema)
  .min(1)
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    list.forEach((t, i) => {
      if (seen.has(t.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: `duplicate id "${t.id}"` });
      seen.add(t.id);
    });
  });
