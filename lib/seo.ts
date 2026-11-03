import { routing } from "../i18n/routing";

/** Canonical and hreflang links for one page. `path` is locale-less ("" for home, "/grammar/dative", ...). */
export function pageAlternates(locale: string, path: string): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = `/${l}${path}`;
  languages["x-default"] = `/${routing.defaultLocale}${path}`;
  return { canonical: `/${locale}${path}`, languages };
}
