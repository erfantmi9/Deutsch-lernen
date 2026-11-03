import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import VocabularyExplorer from "@/components/VocabularyExplorer";
import { reviewCards } from "@/lib/reviewData";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Vocabulary" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/vocabulary") };
}

export default async function VocabularyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Verbs have their own page; everything else is browsed here.
  const cards = reviewCards.filter((c) => c.kind !== "verb");
  return <VocabularyExplorer cards={cards} />;
}
