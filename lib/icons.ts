import type { VocabCategory } from "../types/vocab";

/**
 * Noun icon lookup. Data only: the drawings live in components/illustrations/noun/.
 * Every key here must have a component in that registry (enforced by its Record type).
 */
export const NOUN_ICON_KEYS = [
  // food
  "apfel", "brot", "broetchen", "banane", "tomate", "kaese", "milch", "wasser", "getraenk", "essen",
  // family
  "mann", "frau", "maedchen", "junge", "kind", "vater", "mutter", "bruder",
  // body
  "kopf", "hand", "arm", "bein", "auge", "nase", "fuss", "ohr",
  // home
  "haus", "zimmer", "kueche", "wohnung", "tuer", "fenster", "tisch", "lampe", "stuhl", "bett",
  // travel + animals
  "auto", "zug", "bus", "bahnhof", "flughafen", "reise", "fahrkarte", "stadt", "hund", "katze",
  // school
  "zeitung", "universitaet", "lehrerin", "schule", "lehrer", "schueler", "buch", "heft",
  // time
  "montag", "dienstag", "sommer", "winter", "woche", "stunde", "jahr", "uhr",
] as const;

export type NounIconKey = (typeof NOUN_ICON_KEYS)[number];

export const CATEGORY_ICON_KEYS = [
  "cat-food",
  "cat-family",
  "cat-home",
  "cat-travel",
  "cat-time",
  "cat-school",
  "cat-body",
  "cat-shopping",
  "cat-jobs",
  "cat-weather",
  "cat-colors",
  "cat-clothes",
  "cat-city",
  "cat-hobbies",
  "cat-numbers-time",
  "cat-health",
  "cat-animals",
  "cat-services",
  "cat-celebrations",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];
export type IconKey = NounIconKey | CategoryIconKey;

/** Neutral icon per category, used when a word has no dedicated icon. */
export const CATEGORY_ICON: Readonly<Record<VocabCategory, CategoryIconKey>> = {
  food: "cat-food",
  family: "cat-family",
  home: "cat-home",
  travel: "cat-travel",
  time: "cat-time",
  school: "cat-school",
  body: "cat-body",
  shopping: "cat-shopping",
  jobs: "cat-jobs",
  weather: "cat-weather",
  colors: "cat-colors",
  clothes: "cat-clothes",
  city: "cat-city",
  hobbies: "cat-hobbies",
  "numbers-time": "cat-numbers-time",
  health: "cat-health",
  animals: "cat-animals",
  services: "cat-services",
  celebrations: "cat-celebrations",
};

/** Vocab ids whose drawing differs from their own id (synonyms, future entries). */
const ALIASES: Readonly<Record<string, NounIconKey>> = {
  saft: "getraenk",
  limonade: "getraenk",
  mineralwasser: "wasser",
  kaffee: "getraenk",
  tee: "getraenk",
  flugzeug: "flughafen",
};

/** vocab id -> icon key. Ids equal to a drawing key map to themselves; aliases are added on top. */
export const ICON_BY_VOCAB_ID: Readonly<Record<string, NounIconKey>> = {
  ...(Object.fromEntries(NOUN_ICON_KEYS.map((k) => [k, k])) as Record<NounIconKey, NounIconKey>),
  ...ALIASES,
};

/** Dedicated icon for a vocab id, otherwise the neutral icon of its category. */
export function getIconKey(vocabId: string, category?: VocabCategory): IconKey | null {
  const own = ICON_BY_VOCAB_ID[vocabId];
  if (own) return own;
  return category ? CATEGORY_ICON[category] : null;
}
