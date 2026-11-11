import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { reviewCards } from "@/lib/reviewData";
import { getTopic, TOPIC_IDS, topicCards, topicLabelKey } from "@/lib/vocabTopics";
import TopicPractice from "@/components/vocab/TopicPractice";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => TOPIC_IDS.map((topic) => ({ locale, topic })));
}

type Props = { params: Promise<{ locale: string; topic: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic: id } = await params;
  const topic = getTopic(id);
  if (!topic) return {};
  const t = await getTranslations({ locale, namespace: "TopicPractice" });
  const tv = await getTranslations({ locale, namespace: "Vocabulary" });
  return {
    title: `${t("title", { topic: tv(topicLabelKey(topic)) })} – Deutsch Lernen`,
    description: t("prompt"),
    alternates: pageAlternates(locale, `/vocabulary/${id}/practice`),
    // A drill of the topic page's words: the topic page is the one to index.
    robots: { index: false, follow: true },
  };
}

export default async function TopicPracticePage({ params }: Props) {
  const { locale, topic: id } = await params;
  setRequestLocale(locale);
  const topic = getTopic(id);
  if (!topic) notFound();
  return <TopicPractice topicId={topic.id} cards={topicCards(reviewCards, topic)} />;
}
