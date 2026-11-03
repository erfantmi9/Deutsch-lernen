import type { RuleCategory, VocabEntry } from "@/types/vocab";

export type ExplainLocale = "en" | "fa" | "de";
export type ExplainLevel = "normal" | "simple";

export interface Explanation {
  rule: string;
  example: { de: string; translation: string };
  category: RuleCategory;
}

/**
 * Single entry point for grammar explanations. The UI must only call this function,
 * so an AI-backed implementation can replace it later without touching components.
 */
export function getExplanation(
  word: VocabEntry,
  locale: ExplainLocale,
  level: ExplainLevel = "normal",
): Explanation {
  const rules = word.grammarRule;
  return {
    rule: level === "simple" ? rules.simple[locale] : rules[locale],
    example: {
      de: word.example.de,
      translation: word.example[locale === "de" ? "en" : locale],
    },
    category: word.ruleCategory,
  };
}
