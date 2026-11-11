import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { dialogues } from "@/lib/dialogues";
import { grammarLessons } from "@/lib/grammar";
import { readingTexts } from "@/lib/reading";
import { verbs } from "@/lib/verbs";
import { siteUrl } from "@/lib/site";
import { TOPIC_IDS } from "@/lib/vocabTopics";
import { allPaths, localePath } from "@/lib/sitePaths";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const paths = allPaths({
    lessons: grammarLessons.map((l) => l.id),
    dialogues: dialogues.map((d) => d.id),
    reading: readingTexts.map((r) => r.id),
    verbs: verbs.map((v) => v.id),
    vocabTopics: TOPIC_IDS,
  });
  return paths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}${localePath(locale, path)}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : path.split("/").length > 2 ? 0.5 : 0.7,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${base}${localePath(l, path)}`])),
      },
    })),
  );
}
