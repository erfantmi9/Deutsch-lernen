/**
 * Public base URL, used for absolute links in the sitemap, social cards and hreflang.
 * No setting is needed: on Vercel the production domain is read from the environment at build time.
 * Set NEXT_PUBLIC_SITE_URL to use a custom domain.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export const SITE_NAME = "Doch!";
export const THEME_COLOR = "#F6C445";
