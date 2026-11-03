/** The recommended order through the course, and which step is next. Pure. */

export interface PathInput {
  quizBestStreak: number;
  verbScore: number;
  completedLessonIds: readonly string[];
  /** 0 to 1, see numbersProgress. */
  numbersProgress: number;
  dialoguesPassed: number;
  readingPassed: number;
  sentencesSolved: number;
  reviewDeckSize: number;
  reviewAnswers: number;
  examAttempts: number;
}

export interface PathStepDef {
  id: string;
  href: string;
  done: (i: PathInput) => boolean;
}

export const PATH_STEPS: readonly PathStepDef[] = [
  { id: "articles", href: "/arcade", done: (i) => i.quizBestStreak >= 5 },
  { id: "pronouns", href: "/grammar/pronouns", done: (i) => i.completedLessonIds.includes("pronouns") },
  { id: "verbs", href: "/verbs", done: (i) => i.verbScore >= 10 },
  { id: "cases", href: "/grammar/nom-akk", done: (i) => i.completedLessonIds.includes("nom-akk") },
  { id: "vocabulary", href: "/vocabulary", done: (i) => i.reviewDeckSize >= 10 },
  { id: "numbers", href: "/numbers", done: (i) => i.numbersProgress >= 0.5 },
  { id: "modal", href: "/grammar/modal", done: (i) => i.completedLessonIds.includes("modal") },
  { id: "dialogues", href: "/dialogues", done: (i) => i.dialoguesPassed >= 3 },
  { id: "reading", href: "/reading", done: (i) => i.readingPassed >= 3 },
  { id: "sentences", href: "/sentences", done: (i) => i.sentencesSolved >= 10 },
  { id: "review", href: "/review", done: (i) => i.reviewAnswers >= 50 },
  { id: "exam", href: "/exam", done: (i) => i.examAttempts >= 1 },
];

export interface PathStep {
  id: string;
  href: string;
  done: boolean;
  /** The first step that is not done yet. */
  current: boolean;
}

export function evaluatePath(input: PathInput): PathStep[] {
  let currentFound = false;
  return PATH_STEPS.map((s) => {
    const done = s.done(input);
    const current = !done && !currentFound;
    if (current) currentFound = true;
    return { id: s.id, href: s.href, done, current };
  });
}

export const emptyPathInput = (): PathInput => ({
  quizBestStreak: 0,
  verbScore: 0,
  completedLessonIds: [],
  numbersProgress: 0,
  dialoguesPassed: 0,
  readingPassed: 0,
  sentencesSolved: 0,
  reviewDeckSize: 0,
  reviewAnswers: 0,
  examAttempts: 0,
});

export const GOAL_CHOICES = [10, 20, 40] as const;
export type DailyGoal = (typeof GOAL_CHOICES)[number];
export const DEFAULT_GOAL: DailyGoal = 20;

export const isGoal = (n: unknown): n is DailyGoal => (GOAL_CHOICES as readonly unknown[]).includes(n);

/** 0 to 1. */
export function goalFraction(todayCount: number, goal: number): number {
  return goal <= 0 ? 0 : Math.min(1, Math.max(0, todayCount) / goal);
}

/** Paths worth offering as "continue where you left off": a real learning page, not the home page or the settings-like pages. */
const RESUMABLE = ["arcade", "verbs", "sentences", "grammar", "vocabulary", "numbers", "dialogues", "reading", "review", "listen", "exam"] as const;
export type ResumeSection = (typeof RESUMABLE)[number];

/** Returns the section of a locale-less pathname when it can be resumed, otherwise null. */
export function resumeSection(pathname: string): ResumeSection | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  return (RESUMABLE as readonly string[]).includes(seg) ? (seg as ResumeSection) : null;
}
