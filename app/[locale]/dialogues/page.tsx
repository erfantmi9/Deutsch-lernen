import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import DialoguesIndex from "@/components/DialoguesIndex";
import { dialogues } from "@/lib/dialogues";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dialogues" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/dialogues") };
}

export default async function DialoguesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Only what the cards need: the lines and quizzes stay out of this page's client bundle.
  const cards = dialogues.map((d) => ({
    id: d.id,
    topic: d.topic,
    title: d.title,
    setting: d.setting,
    lineCount: d.lines.length,
  }));

  return <DialoguesIndex cards={cards} />;
}
