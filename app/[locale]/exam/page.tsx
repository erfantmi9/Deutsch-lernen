import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import ExamView from "@/components/ExamView";
import { exam } from "@/lib/examData";
import { getReadingText } from "@/lib/reading";
import type { ReadingText } from "@/types/reading";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Exam" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/exam") };
}

export default async function ExamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const texts = exam.lesen.textIds.map((id) => getReadingText(id)).filter((x): x is ReadingText => x !== undefined);
  return <ExamView data={exam} texts={texts} />;
}
