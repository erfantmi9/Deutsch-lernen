import { routing } from "../i18n/routing";

/** Every public page as locale-less paths. Used by the sitemap; the test checks it against the routes. */

export const STATIC_PATHS = [
  "",
  "/arcade",
  "/verbs",
  "/sentences",
  "/grammar",
  "/vocabulary",
  "/numbers",
  "/dialogues",
  "/reading",
  "/review",
  "/progress",
  "/exam",
  "/listen",
  "/search",
] as const;

export function allPaths(ids: {
  lessons: readonly string[];
  dialogues: readonly string[];
  reading: readonly string[];
  verbs?: readonly string[];
  vocabTopics?: readonly string[];
}): string[] {
  return [
    ...STATIC_PATHS,
    ...ids.lessons.map((id) => `/grammar/${id}`),
    ...ids.dialogues.map((id) => `/dialogues/${id}`),
    ...ids.reading.map((id) => `/reading/${id}`),
    ...(ids.verbs ?? []).map((id) => `/verbs/${id}`),
    ...(ids.vocabTopics ?? []).map((id) => `/vocabulary/${id}`),
  ];
}

/** `/en`, `/en/grammar`, ... for every locale. */
export const localePath = (locale: string, path: string): string => `/${locale}${path}`;

export const LOCALES = routing.locales;
