import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fa", "de"],
  defaultLocale: "fa",
  // Persian unless the learner picked a language themselves: no guessing from the browser's Accept-Language, and no
  // next-intl cookie (it remembers the last locale *visited*, also through a shared link, and lasts one session only).
  // The learner's own choice is the LOCALE_COOKIE below, read by middleware.ts.
  localeDetection: false,
  localeCookie: false,
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: readonly Locale[] = ["fa"];

/** The language the learner chose in the language menu (set by lib/localePreference.ts). */
export const LOCALE_COOKIE = "doch-locale";

export const isLocale = (v: unknown): v is Locale => (routing.locales as readonly unknown[]).includes(v);
