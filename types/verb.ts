import type { I18n2, I18n3, Level } from "./common";

export type VerbType = "regular" | "irregular" | "modal" | "separable" | "reflexive";
export type VerbCategory = "basic" | "daily" | "movement" | "communication" | "modal";

export const VERB_CATEGORIES: readonly VerbCategory[] = [
  "basic",
  "daily",
  "movement",
  "communication",
  "modal",
];

export const PERSONS = ["ich", "du", "er_sie_es", "wir", "ihr", "sie_Sie"] as const;
export type Person = (typeof PERSONS)[number];

export type Conjugation = Record<Person, string>;

export interface VerbEntry {
  id: string;
  infinitive: string;
  level: Level;
  category: VerbCategory;
  translations: I18n2;
  type: VerbType;
  /** e.g. "a→ä" */
  stemChange?: string;
  /** Present for separable verbs. `present` stores the finite stem form WITHOUT the prefix. */
  separable?: { prefix: string; stem: string };
  /** FULL forms, stored explicitly, never computed at runtime. */
  present: Conjugation;
  perfekt: { auxiliary: "haben" | "sein"; partizip2: string };
  praeteritum?: Conjugation;
  example: I18n3;
  note?: I18n3;
}
