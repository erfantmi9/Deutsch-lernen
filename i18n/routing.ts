import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fa", "de"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: readonly Locale[] = ["fa"];
