import type { I18n2, I18n3, Level } from "./common";

export type Article = "der" | "die" | "das";
export type RuleCategory = "suffix" | "semantic" | "exception" | "learn";
export type VocabCategory =
  | "food"
  | "family"
  | "home"
  | "travel"
  | "time"
  | "school"
  | "body"
  | "shopping"
  | "jobs"
  | "weather"
  | "colors"
  | "clothes"
  | "city"
  | "hobbies"
  | "numbers-time";

export const VOCAB_CATEGORIES: readonly VocabCategory[] = [
  "food",
  "family",
  "home",
  "travel",
  "time",
  "school",
  "body",
  "shopping",
  "jobs",
  "weather",
  "colors",
  "clothes",
  "city",
  "hobbies",
  "numbers-time",
];

export interface VocabEntry {
  id: string;
  word: string;
  article: Article;
  plural: string;
  translations: I18n2;
  grammarRule: I18n3 & { simple: I18n3 };
  ruleCategory: RuleCategory;
  example: I18n3;
  category: VocabCategory;
  level: Level;
  tags?: string[];
}
