import raw from "../data/verbs/a1.json";
import { VerbListSchema } from "./schemas/verb";
import { PERSONS, VERB_CATEGORIES } from "../types/verb";
import type { Conjugation, Person, VerbCategory, VerbEntry, VerbType } from "../types/verb";
import type { Level } from "../types/common";

// Validated once at module load; throws a ZodError on malformed data.
export const verbs: readonly VerbEntry[] = VerbListSchema.parse(raw);

const byId: ReadonlyMap<string, VerbEntry> = new Map(verbs.map((v) => [v.id, v]));

export function getVerb(id: string): VerbEntry | undefined {
  return byId.get(id);
}

export function getVerbsByType(type: VerbType): VerbEntry[] {
  return verbs.filter((v) => v.type === type);
}

export interface VerbFilter {
  level?: Level;
  category?: VerbCategory;
  type?: VerbType;
}

export function filterVerbs(filter: VerbFilter = {}): VerbEntry[] {
  return verbs.filter(
    (v) =>
      (filter.level === undefined || v.level === filter.level) &&
      (filter.category === undefined || v.category === filter.category) &&
      (filter.type === undefined || v.type === filter.type),
  );
}

/** Parses a `?type=` query value; anything that isn't a known verb type yields null. */
export function parseVerbType(value: string | null): VerbType | null {
  return getAvailableTypes().find((t) => t === value) ?? null;
}

/** Parses a `?topic=` query value; anything that isn't a known verb category yields null. */
export function parseVerbCategory(value: string | null): VerbCategory | null {
  return getAvailableCategories().find((c) => c === value) ?? null;
}

/** Verb categories (topics) that actually occur in the data, in a stable display order. */
export function getAvailableCategories(): VerbCategory[] {
  return VERB_CATEGORIES.filter((c) => verbs.some((v) => v.category === c));
}

/** Verb types that actually occur in the data, in a stable display order. */
export function getAvailableTypes(): VerbType[] {
  const order: VerbType[] = ["regular", "irregular", "modal", "separable", "reflexive"];
  return order.filter((t) => verbs.some((v) => v.type === t));
}

/** Stem of an infinitive: strips a trailing -en (or -n). */
export function infinitiveStem(infinitive: string): string {
  if (infinitive.endsWith("en")) return infinitive.slice(0, -2);
  if (infinitive.endsWith("n")) return infinitive.slice(0, -1);
  return infinitive;
}

/**
 * Persons whose present form shows a stem change (e.g. fahren: du fährst, er fährt).
 * Only verbs that declare `stemChange` are inspected; forms are never generated, only compared.
 */
export function getChangedPersons(verb: VerbEntry): Person[] {
  if (!verb.stemChange) return [];
  const stem = (verb.separable ? infinitiveStem(verb.separable.stem) : infinitiveStem(verb.infinitive)).toLowerCase();
  return PERSONS.filter((p) => !verb.present[p].toLowerCase().startsWith(stem));
}

/** Auxiliary conjugation + Partizip II for every person, e.g. er_sie_es -> "ist gefahren". */
export function perfektForms(verb: VerbEntry): Conjugation {
  const aux = getVerb(verb.perfekt.auxiliary);
  if (!aux) throw new Error(`Auxiliary verb "${verb.perfekt.auxiliary}" missing from verb data`);
  const out = {} as Conjugation;
  for (const p of PERSONS) out[p] = `${aux.present[p]} ${verb.perfekt.partizip2}`;
  return out;
}
