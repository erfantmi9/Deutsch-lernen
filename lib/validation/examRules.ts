import type { ExamData } from "../../types/exam";
import { wordCount } from "../exam";
import type { Problem } from "./rules";

const err = (message: string): Problem => ({ severity: "error", message });
const warn = (message: string): Problem => ({ severity: "warning", message });

/** Cross-checks for the exam data: the reading texts must exist and the parts must be answerable. */
export function checkExam(exam: ExamData, readingIds: ReadonlySet<string>): Problem[] {
  const problems: Problem[] = [];

  for (const id of exam.lesen.textIds) {
    if (!readingIds.has(id)) problems.push(err(`lesen: reading text "${id}" does not exist`));
  }
  if (new Set(exam.lesen.textIds).size !== exam.lesen.textIds.length) problems.push(err("lesen: a reading text is listed twice"));

  for (const item of exam.hoeren) {
    if (wordCount(item.script) < 10) problems.push(warn(`hoeren [${item.id}]: script is very short`));
    if (!/[.!?]$/u.test(item.question)) problems.push(warn(`hoeren [${item.id}]: question has no closing punctuation`));
  }

  if (exam.schreiben.message.points.length < 3) problems.push(warn("schreiben: fewer than 3 content points"));
  if (exam.schreiben.message.minWords > 40) problems.push(warn("schreiben: minWords is above 40"));
  if (exam.sprechen.length < 2) problems.push(warn("sprechen: fewer than 2 parts"));
  return problems;
}
