import type { I18n2, I18n3, Level } from "./common";

export type Article = "der" | "die" | "das";
export type RuleCategory = "suffix" | "semantic" | "exception" | "learn";

export const VOCAB_CATEGORIES = [
  "food",
  "family",
  "home",
  "travel",
  "time",
  "school",
  "body",
  "health",
  "animals",
  "shopping",
  "jobs",
  "weather",
  "colors",
  "clothes",
  "city",
  "services",
  "hobbies",
  "celebrations",
  "numbers-time",
] as const;
export type VocabCategory = (typeof VOCAB_CATEGORIES)[number];

/**
 * Sub-groups inside a noun category. A category listed here requires every one of its words to name one of these
 * sub-groups (`subcategory`); a category not listed here must not use the field. Labels live in the messages under
 * `Vocabulary.subgroups.<category>.<subcategory>`.
 */
export const VOCAB_SUBCATEGORIES: Readonly<Partial<Record<VocabCategory, readonly string[]>>> = {
  food: ["fruit-veg", "groceries", "meals", "drinks"],
  family: ["family", "relatives", "people"],
  home: ["rooms", "furniture", "household"],
  travel: ["transport", "station", "holiday"],
  time: ["calendar", "units"],
  school: ["classroom", "people-places", "subjects"],
  body: ["head", "body"],
  health: ["illness", "doctor"],
  animals: ["pets", "farm", "wild"],
  services: ["post", "office", "personal-data"],
  celebrations: ["holidays", "party"],
};

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
  /** Required for categories listed in VOCAB_SUBCATEGORIES, forbidden otherwise. */
  subcategory?: string;
  level: Level;
  tags?: string[];
  /**
   * Plural-only noun (die Eltern, die Geschwister). `word` and `plural` are the same plural form and `article` is
   * the plural "die", so these words are left out of the der/die/das quiz and shown without the article colour.
   */
  pluralOnly?: true;
}
