/** Badge rules. Pure: the numbers come from the stores, the rules live here. */

export const BADGE_KEYS = [
  "firstCorrect",
  "streak5",
  "streak10",
  "verbs10",
  "sentences10",
  "daily",
  "grammar3",
  "dialogue5",
  "reading5",
  "review50",
  "streak7",
  "mature25",
] as const;

export type BadgeKey = (typeof BADGE_KEYS)[number];

export interface BadgeInput {
  /** Correct article answers in total. */
  quizScore: number;
  quizBestStreak: number;
  /** Correct verb answers in total. */
  verbScore: number;
  verbBestStreak: number;
  sentenceBestStreak: number;
  sentencesSolved: number;
  /** Days with at least one answer. */
  activeDays: number;
  /** Longest run of consecutive active days. */
  longestDayStreak: number;
  grammarLessonsDone: number;
  dialoguesPassed: number;
  readingPassed: number;
  /** Review answers in total (all days). */
  reviewAnswers: number;
  /** Review cards with an interval of at least three weeks. */
  matureCards: number;
}

export interface BadgeState {
  key: BadgeKey;
  current: number;
  target: number;
  earned: boolean;
}

export const BADGE_TARGETS: Readonly<Record<BadgeKey, number>> = {
  firstCorrect: 1,
  streak5: 5,
  streak10: 10,
  verbs10: 10,
  sentences10: 10,
  daily: 3,
  grammar3: 3,
  dialogue5: 5,
  reading5: 5,
  review50: 50,
  streak7: 7,
  mature25: 25,
};

function currentValue(key: BadgeKey, i: BadgeInput): number {
  switch (key) {
    case "firstCorrect":
      return i.quizScore;
    case "streak5":
    case "streak10":
      return Math.max(i.quizBestStreak, i.verbBestStreak, i.sentenceBestStreak);
    case "verbs10":
      return i.verbScore;
    case "sentences10":
      return i.sentencesSolved;
    case "daily":
      return i.activeDays;
    case "grammar3":
      return i.grammarLessonsDone;
    case "dialogue5":
      return i.dialoguesPassed;
    case "reading5":
      return i.readingPassed;
    case "review50":
      return i.reviewAnswers;
    case "streak7":
      return i.longestDayStreak;
    case "mature25":
      return i.matureCards;
  }
}

export function evaluateBadges(input: BadgeInput): BadgeState[] {
  return BADGE_KEYS.map((key) => {
    const target = BADGE_TARGETS[key];
    const raw = Math.max(0, currentValue(key, input));
    return { key, current: Math.min(raw, target), target, earned: raw >= target };
  });
}

export const emptyBadgeInput = (): BadgeInput => ({
  quizScore: 0,
  quizBestStreak: 0,
  verbScore: 0,
  verbBestStreak: 0,
  sentenceBestStreak: 0,
  sentencesSolved: 0,
  activeDays: 0,
  longestDayStreak: 0,
  grammarLessonsDone: 0,
  dialoguesPassed: 0,
  readingPassed: 0,
  reviewAnswers: 0,
  matureCards: 0,
});
