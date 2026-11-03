import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import GrammarIndex from "@/components/GrammarIndex";
import { grammarLessons } from "@/lib/grammar";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Grammar" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/grammar") };
}

export default async function GrammarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Only what the cards need: the sections and examples stay out of this page's client bundle.
  const cards = grammarLessons.map(({ id, order, topic, title, summary, exerciseIds }) => ({
    id,
    order,
    topic,
    title,
    summary,
    exerciseIds,
  }));

  return <GrammarIndex lessons={cards} />;
}
