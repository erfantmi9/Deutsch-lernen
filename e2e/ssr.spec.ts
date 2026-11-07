import { expect, test } from "@playwright/test";

/*
 * The verb pages must be in the static HTML (no JavaScript): useSearchParams on a static page renders everything up to the
 * nearest Suspense boundary on the client only, which used to leave the verb list, and most of the verb detail page, out of
 * the HTML. Fetched with `request` (raw HTML, nothing executed). Viewport-independent: runs once, in the desktop project.
 */
test.skip(({ isMobile }) => isMobile, "raw HTML does not depend on the viewport: desktop project only");

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ") // the RSC payload repeats everything inside <script>: ignore it
    .replace(/<template[\s\S]*?<\/template>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");

for (const locale of ["en", "fa", "de"] as const) {
  test(`/${locale}/verbs/sein: conjugation, actions and prev/next are in the server HTML`, async ({ request }) => {
    const res = await request.get(`/${locale}/verbs/sein`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    const body = text(html);
    for (const form of ["bin", "bist", "ist", "sind", "seid"]) expect(body).toMatch(new RegExp(`\\b${form}\\b`));
    // Filter-dependent links are present (unfiltered) without JavaScript.
    expect(html).toMatch(new RegExp(`href="/${locale}/verbs"`)); // back to list
    expect(html).toMatch(new RegExp(`href="/${locale}/verbs\\?practice=1"`)); // practice
    expect(html).toMatch(/rel="next"/); // previous / next verb navigation
  });

  test(`/${locale}/verbs: the verb list is in the server HTML`, async ({ request }) => {
    const res = await request.get(`/${locale}/verbs`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    for (const id of ["sein", "haben", "machen"]) expect(html).toContain(`href="/${locale}/verbs/${id}"`);
    expect(text(html)).toMatch(/\bhaben\b/);
  });
}
