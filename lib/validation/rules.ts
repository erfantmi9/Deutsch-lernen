import type { SentenceExercise } from "../../types/sentence";
import type { VerbEntry } from "../../types/verb";
import { PERSONS } from "../../types/verb";
import type { VocabEntry } from "../../types/vocab";

export type Severity = "error" | "warning";

export interface Problem {
  severity: Severity;
  message: string;
}

const err = (message: string): Problem => ({ severity: "error", message });
const warn = (message: string): Problem => ({ severity: "warning", message });

/** Case- and trailing-punctuation-insensitive token form used for all token comparisons. */
export function normalizeToken(token: string): string {
  return token.trim().toLowerCase().replace(/[.?!]+$/u, "");
}

export function isPermutation(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const x = a.map(normalizeToken).sort();
  const y = b.map(normalizeToken).sort();
  return x.every((t, i) => t === y[i]);
}

const DAS_SUFFIXES = ["chen", "lein"];
const DIE_SUFFIXES = ["ung", "heit", "keit", "schaft"];

export function checkNoun(entry: VocabEntry): Problem[] {
  const problems: Problem[] = [];
  const w = entry.word.toLowerCase();
  const das = DAS_SUFFIXES.find((s) => w.endsWith(s));
  if (das && entry.article !== "das") {
    problems.push(warn(`"${entry.word}" ends in -${das} but article is "${entry.article}" (expected das)`));
  }
  const die = DIE_SUFFIXES.find((s) => w.endsWith(s));
  if (die && entry.article !== "die") {
    problems.push(warn(`"${entry.word}" ends in -${die} but article is "${entry.article}" (expected die)`));
  }
  return problems;
}

export function checkVerb(entry: VerbEntry): Problem[] {
  const problems: Problem[] = [];
  for (const p of PERSONS) {
    if (!entry.present[p]?.trim()) problems.push(err(`present.${p} is empty`));
  }
  if (!entry.perfekt?.auxiliary) problems.push(err("perfekt.auxiliary is missing"));
  if (!entry.perfekt?.partizip2?.trim()) problems.push(err("perfekt.partizip2 is empty"));
  if (entry.type === "separable" && !entry.separable) {
    problems.push(err("separable verb has no `separable` object"));
  }
  if (entry.separable && entry.type !== "separable") {
    problems.push(warn("`separable` is set but type is not 'separable'"));
  }
  if (entry.separable && !entry.perfekt.partizip2.startsWith(entry.separable.prefix)) {
    problems.push(
      warn(`partizip2 "${entry.perfekt.partizip2}" does not start with prefix "${entry.separable.prefix}"`),
    );
  }
  if (entry.separable && !entry.infinitive.startsWith(entry.separable.prefix)) {
    problems.push(err(`infinitive "${entry.infinitive}" does not start with prefix "${entry.separable.prefix}"`));
  }
  if (entry.praeteritum) {
    for (const p of PERSONS) {
      if (!entry.praeteritum[p]?.trim()) problems.push(err(`praeteritum.${p} is empty`));
    }
  }
  return problems;
}

export function checkSentence(entry: SentenceExercise): Problem[] {
  const problems: Problem[] = [];
  if (entry.tokens.length < 3) problems.push(err(`needs at least 3 tokens (has ${entry.tokens.length})`));

  if (entry.roles && entry.roles.length !== entry.tokens.length) {
    problems.push(err(`roles has ${entry.roles.length} entries but tokens has ${entry.tokens.length}`));
  }

  const normalized = new Set(entry.tokens.map(normalizeToken));
  for (const d of entry.distractors ?? []) {
    if (normalized.has(normalizeToken(d))) {
      problems.push(err(`distractor "${d}" is also one of the tokens`));
    }
  }
  (entry.acceptedOrders ?? []).forEach((order, i) => {
    if (!isPermutation(order, entry.tokens)) {
      problems.push(err(`acceptedOrders[${i}] is not a permutation of tokens`));
    } else if (order.map(normalizeToken).join(" ") === entry.tokens.map(normalizeToken).join(" ")) {
      problems.push(warn(`acceptedOrders[${i}] equals the main order`));
    }
  });
  return problems;
}

export function findDuplicateIds(items: ReadonlyArray<{ file: string; id: string }>): Problem[] {
  const seen = new Map<string, string>();
  const out: Problem[] = [];
  for (const { file, id } of items) {
    const first = seen.get(id);
    if (first !== undefined) out.push(err(`duplicate id "${id}" (also in ${first}) [${file}]`));
    else seen.set(id, file);
  }
  return out;
}
