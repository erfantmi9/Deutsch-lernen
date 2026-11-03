import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import ReadingIndex from "@/components/ReadingIndex";
import { readingTexts } from "@/lib/reading";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Reading" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/reading") };
}

export default async function ReadingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Only what the cards need: the texts and tasks stay out of this page's client bundle.
  const cards = readingTexts.map((t) => ({ id: t.id, kind: t.kind, title: t.title, taskCount: t.tasks.length }));

  return <ReadingIndex cards={cards} />;
}
