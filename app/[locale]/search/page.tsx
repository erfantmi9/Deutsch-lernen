import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import SearchView from "@/components/SearchView";
import { dialogues } from "@/lib/dialogues";
import { grammarLessons } from "@/lib/grammar";
import { readingTexts } from "@/lib/reading";
import { buildSearchIndex } from "@/lib/search";
import type { SearchLocale } from "@/lib/search";
import { verbs } from "@/lib/verbs";
import { vocab } from "@/lib/vocab";
import { adjectives, adverbs, phrases, prepositions } from "@/lib/vocabExtended";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/search") };
}

export default async function SearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const items = buildSearchIndex(locale as SearchLocale, {
    nouns: vocab,
    verbs,
    adjectives,
    adverbs,
    prepositions,
    phrases,
    lessons: grammarLessons,
    dialogues,
    reading: readingTexts,
  });
  return <SearchView items={items} />;
}
