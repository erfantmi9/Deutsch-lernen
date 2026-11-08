import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Square Doch! app icon (the dog face on a mustard tile). The artwork lives in public/brand/, made from one source,
 * so the PWA icons match the logo exactly. Served from build-time static routes (app/icon-192.png, app/icon-512.png).
 */
export async function appIcon(size: 192 | 512): Promise<Response> {
  const data = await readFile(path.join(process.cwd(), "public", "brand", `icon-${size}.png`));
  return new Response(new Uint8Array(data), {
    headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
  });
}
