import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { reviewCards } from "@/lib/reviewData";
import { DECK_IDS, deckCards, deckLabelKey, isDeckId } from "@/lib/flashDecks";
import DeckPlayer from "@/components/flashcards/DeckPlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => DECK_IDS.map((deck) => ({ locale, deck })));
}

type Props = { params: Promise<{ locale: string; deck: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, deck } = await params;
  if (!isDeckId(deck)) return {};
  const t = await getTranslations({ locale, namespace: "Decks" });
  const tv = await getTranslations({ locale, namespace: "Vocabulary" });
  return {
    title: `${t("pageTitle", { deck: tv(deckLabelKey(deck)) })} – Deutsch Lernen`,
    description: t("hint"),
    alternates: pageAlternates(locale, `/review/${deck}`),
    // The same words as the topic pages: those are the ones to index.
    robots: { index: false, follow: true },
  };
}

export default async function DeckPage({ params }: Props) {
  const { locale, deck } = await params;
  setRequestLocale(locale);
  if (!isDeckId(deck)) notFound();
  const tv = await getTranslations({ locale, namespace: "Vocabulary" });
  return <DeckPlayer deckName={tv(deckLabelKey(deck))} cards={deckCards(reviewCards, deck)} />;
}
