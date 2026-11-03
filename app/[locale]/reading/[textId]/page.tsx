import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import ReadingView from "@/components/ReadingView";
import { getReadingNeighbours, getReadingText, readingTexts } from "@/lib/reading";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => readingTexts.map((t) => ({ locale, textId: t.id })));
}

type Props = { params: Promise<{ locale: string; textId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, textId } = await params;
  const text = getReadingText(textId);
  if (!text) return {};
  return { title: `${text.title[locale as "en" | "fa" | "de"]} – Deutsch Lernen`, alternates: pageAlternates(locale, `/reading/${textId}`) };
}

export default async function ReadingTextPage({ params }: Props) {
  const { locale, textId } = await params;
  setRequestLocale(locale);

  const text = getReadingText(textId);
  if (!text) notFound();

  const { prev, next } = getReadingNeighbours(text.id);
  const link = (t: typeof prev) => (t ? { id: t.id, title: t.title } : null);

  return <ReadingView text={text} prev={link(prev)} next={link(next)} />;
}
