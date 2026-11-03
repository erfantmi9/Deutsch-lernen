import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import ProgressDashboard from "@/components/ProgressDashboard";
import { dialogues } from "@/lib/dialogues";
import { grammarLessons } from "@/lib/grammar";
import { readingTexts } from "@/lib/reading";
import { reviewCards } from "@/lib/reviewData";
import { sentences } from "@/lib/sentences";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Progress" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/progress") };
}

export default async function ProgressPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Only articles and verbs are looked up by id here, so the slimmed list is enough.
  const cards = reviewCards.filter((c) => c.kind === "noun" || c.kind === "verb");
  return (
    <ProgressDashboard
      cards={cards}
      totals={{
        grammar: grammarLessons.length,
        dialogues: dialogues.length,
        reading: readingTexts.length,
        sentences: sentences.length,
      }}
    />
  );
}
