import { EXAM_MODULES, PASS_FRACTION, POINTS_PER_MODULE } from "../types/exam";
import type { ExamData, ExamModule, FormField, ListeningItem, MessagePoint } from "../types/exam";

/** Scoring for the practice exam. Pure. Every module ends as 0 to 25 points; 60 of 100 passes. */

export type ModuleScores = Readonly<Partial<Record<ExamModule, number>>>;

/** Scales `got` out of `max` to the 25 points of a module. */
export function toModulePoints(got: number, max: number): number {
  if (max <= 0) return 0;
  const clamped = Math.min(max, Math.max(0, got));
  return Math.round((clamped / max) * POINTS_PER_MODULE * 10) / 10;
}

export const MAX_TOTAL = EXAM_MODULES.length * POINTS_PER_MODULE;
export const PASS_POINTS = MAX_TOTAL * PASS_FRACTION;

export function totalPoints(scores: ModuleScores): number {
  return Math.round(EXAM_MODULES.reduce((sum, m) => sum + (scores[m] ?? 0), 0) * 10) / 10;
}

export function isComplete(scores: ModuleScores): boolean {
  return EXAM_MODULES.every((m) => scores[m] !== undefined);
}

export const isPassing = (total: number): boolean => total >= PASS_POINTS;

/** Lower-case, single spaces, no surrounding punctuation. */
export function normaliseText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ").replace(/^[\s.,;:!?]+|[\s.,;:!?]+$/g, "");
}

export function wordCount(s: string): number {
  const t = s.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** Listening: `answers` maps item id to the chosen option. Returns correct count and the module points. */
export function scoreListening(items: readonly ListeningItem[], answers: Readonly<Record<string, string>>): { correct: number; total: number; points: number } {
  const correct = items.filter((i) => answers[i.id] === i.answer).length;
  return { correct, total: items.length, points: toModulePoints(correct, items.length) };
}

export interface WritingScore {
  /** Form fields filled in correctly. */
  formCorrect: number;
  formTotal: number;
  /** Which content points of the message were found. */
  found: string[];
  missing: string[];
  words: number;
  longEnough: boolean;
  points: number;
}

export function scoreForm(fields: readonly FormField[], values: Readonly<Record<string, string>>): { correct: number; total: number } {
  const correct = fields.filter((f) => f.expected.includes(normaliseText(values[f.id] ?? ""))).length;
  return { correct, total: fields.length };
}

export function scoreMessage(points: readonly MessagePoint[], text: string, minWords: number): { found: string[]; missing: string[]; words: number; longEnough: boolean } {
  const lower = text.toLowerCase();
  const found = points.filter((p) => p.patterns.some((pat) => lower.includes(pat))).map((p) => p.id);
  return {
    found,
    missing: points.filter((p) => !found.includes(p.id)).map((p) => p.id),
    words: wordCount(text),
    longEnough: wordCount(text) >= minWords,
  };
}

/**
 * Writing is scored by the computer only for what it can check: form fields, content points and length.
 * It does not check grammar, so this is an estimate.
 */
export function scoreWriting(writing: ExamData["schreiben"], values: Readonly<Record<string, string>>, message: string): WritingScore {
  const form = scoreForm(writing.form.fields, values);
  const msg = scoreMessage(writing.message.points, message, writing.message.minWords);
  // A message that is far too short earns no content points: a single "?" must not count as a text.
  const contentFound = msg.longEnough ? msg.found.length : 0;
  const got = form.correct + contentFound;
  const max = form.total + writing.message.points.length;
  return { formCorrect: form.correct, formTotal: form.total, ...msg, found: msg.longEnough ? msg.found : [], missing: msg.longEnough ? msg.missing : writing.message.points.map((p) => p.id), points: toModulePoints(got, max) };
}

/** Speaking is self-assessed: one point per ticked item. */
export function scoreSpeaking(parts: ExamData["sprechen"], ticked: ReadonlySet<string>): { ticked: number; total: number; points: number } {
  const all = parts.flatMap((p) => p.checklist.map((c) => `${p.id}:${c.id}`));
  const got = all.filter((id) => ticked.has(id)).length;
  return { ticked: got, total: all.length, points: toModulePoints(got, all.length) };
}

/** 90 -> "1:30". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface ExamAttempt {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  scores: Readonly<Record<ExamModule, number>>;
  total: number;
}

export const MAX_ATTEMPTS_KEPT = 10;

export function addAttempt(history: readonly ExamAttempt[], attempt: ExamAttempt): ExamAttempt[] {
  return [attempt, ...history].slice(0, MAX_ATTEMPTS_KEPT);
}

export const bestTotal = (history: readonly ExamAttempt[]): number => history.reduce((b, a) => Math.max(b, a.total), 0);
