import type { AdjectiveEntry, AdverbEntry, PhraseEntry, PrepositionEntry } from "../../types/vocab-extended";
import type { VerbEntry } from "../../types/verb";
import type { VocabEntry } from "../../types/vocab";
import type { Problem } from "./rules";

/** Content checks for the extended word classes. Pure; they only report, the validator decides. */

const warn = (message: string): Problem => ({ severity: "warning", message });
const err = (message: string): Problem => ({ severity: "error", message });

const norm = (s: string): string => s.toLowerCase();

/** The example sentence should actually use the word (or, for nouns, its plural). */
export function exampleUsesWord(example: string, forms: readonly string[]): boolean {
  const text = norm(example);
  return forms.some((f) => f.length > 0 && text.includes(norm(f)));
}

export function checkNounExample(entry: VocabEntry): Problem[] {
  const forms = entry.plural === "–" ? [entry.word] : [entry.word, entry.plural];
  return exampleUsesWord(entry.example.de, forms) ? [] : [warn(`example does not contain "${entry.word}"`)];
}

export function checkAdjective(entry: AdjectiveEntry): Problem[] {
  const problems: Problem[] = [];
  if (!exampleUsesWord(entry.example.de, [entry.word])) problems.push(warn(`example does not contain "${entry.word}"`));
  if (entry.superlative !== undefined && !entry.superlative.startsWith("am ")) {
    problems.push(err(`superlative "${entry.superlative}" must start with "am "`));
  }
  if (entry.comparative !== undefined && entry.comparative === entry.word) {
    problems.push(err("comparative equals the base form"));
  }
  return problems;
}

export function checkAdverb(entry: AdverbEntry): Problem[] {
  return exampleUsesWord(entry.example.de, [entry.word]) ? [] : [warn(`example does not contain "${entry.word}"`)];
}

export function checkPreposition(entry: PrepositionEntry): Problem[] {
  const problems: Problem[] = [];
  if (!exampleUsesWord(entry.example.de, [entry.word])) problems.push(warn(`example does not contain "${entry.word}"`));
  if (entry.wechsel && !(entry.cases.includes("akk") && entry.cases.includes("dat"))) {
    problems.push(err("a two-way preposition needs both cases"));
  }
  return problems;
}

export function checkPhrase(entry: PhraseEntry): Problem[] {
  const problems: Problem[] = [];
  if (!/[.!?]$/u.test(entry.text)) problems.push(warn("phrase has no closing punctuation"));
  if (entry.reply !== undefined && !/[.!?]$/u.test(entry.reply)) problems.push(warn("reply has no closing punctuation"));
  return problems;
}

/** A verb example should contain the infinitive, a present form or the Partizip II. */
export function checkVerbExample(entry: VerbEntry): Problem[] {
  const forms = [entry.infinitive, entry.perfekt.partizip2, ...Object.values(entry.present)];
  return exampleUsesWord(entry.example.de, forms) ? [] : [warn(`example does not contain a form of "${entry.infinitive}"`)];
}
