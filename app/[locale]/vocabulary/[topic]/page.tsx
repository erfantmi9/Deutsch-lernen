import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { reviewCards } from "@/lib/reviewData";
import { getTopic, TOPIC_IDS, topicCards, topicLabelKey } from "@/lib/vocabTopics";
import VocabularyTopic from "@/components/vocab/VocabularyTopic";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => TOPIC_IDS.map((topic) => ({ locale, topic })));
}

type Props = { params: Promise<{ locale: string; topic: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic: id } = await params;
  const topic = getTopic(id);
  if (!topic) return {};
  const t = await getTranslations({ locale, namespace: "Vocabulary" });
  const name = t(topicLabelKey(topic));
  return {
    title: `${name} – ${t("title")} – Deutsch Lernen`,
    description: `${name}: ${t("count", { count: topicCards(reviewCards, topic).length })}. ${t("subtitle")}`,
    alternates: pageAlternates(locale, `/vocabulary/${id}`),
  };
}

export default async function VocabularyTopicPage({ params }: Props) {
  const { locale, topic: id } = await params;
  setRequestLocale(locale);
  const topic = getTopic(id);
  if (!topic) notFound();
  return <VocabularyTopic topicId={topic.id} cards={topicCards(reviewCards, topic)} />;
}
