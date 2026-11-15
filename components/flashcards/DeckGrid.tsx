"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { deckCards, deckLabelKey } from "@/lib/flashDecks";
import type { DeckId } from "@/lib/flashDecks";
import type { ReviewCard } from "@/lib/reviewCards";
import { deckPercent, WORD_TYPE_TOPICS } from "@/lib/vocabTopics";
import { VOCAB_CATEGORIES } from "@/types/vocab";
import { TopicCard } from "../vocab/parts";

const SMALL_DECKS: readonly DeckId[] = ["verbs", ...WORD_TYPE_TOPICS];

/**
 * The ready-made decks on the flashcards page: every vocabulary topic, then verbs and the other word types. The bar on
 * each shows how much of it is already in the learner's own cards (`myCards` is null until they have loaded).
 */
export default function DeckGrid({ cards, myCards }: { cards: readonly ReviewCard[]; myCards: Readonly<Record<string, unknown>> | null }) {
  const t = useTranslations("Decks");
  const tv = useTranslations("Vocabulary");
  const ids = useMemo(
    () => new Map([...VOCAB_CATEGORIES, ...SMALL_DECKS].map((id) => [id, deckCards(cards, id).map((c) => c.id)] as const)),
    [cards],
  );

  const deck = (id: DeckId, compact = false) => {
    const list = ids.get(id) ?? [];
    return (
      <TopicCard
        key={id}
        topic={id}
        href={`/review/${id}`}
        name={tv(deckLabelKey(id))}
        count={list.length}
        percent={myCards ? deckPercent(list, myCards) : null}
        compact={compact}
      />
    );
  };

  return (
    <section aria-labelledby="decks-title" data-decks className="space-y-3">
      <header className="space-y-1">
        <h2 id="decks-title" className="text-xl font-extrabold">
          {t("title")}
        </h2>
        <p className="text-sm text-text-muted">{t("hint")}</p>
      </header>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{VOCAB_CATEGORIES.map((id) => deck(id))}</ul>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{SMALL_DECKS.map((id) => deck(id, true))}</ul>
    </section>
  );
}
