import { readFile } from "node:fs/promises";
import path from "node:path";
import { routing } from "@/i18n/routing";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/** The Doch! card shown when a link is shared: the logo on mustard (public/brand/doch-og-1200x630.png). */
export default async function OpenGraphImage() {
  const data = await readFile(path.join(process.cwd(), "public", "brand", "doch-og-1200x630.png"));
  return new Response(new Uint8Array(data), { headers: { "content-type": contentType } });
}
