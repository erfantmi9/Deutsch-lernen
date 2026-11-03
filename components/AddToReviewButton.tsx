"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { isNew } from "@/lib/srs";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";

/**
 * Adds one word to the spaced-repetition deck. Pressing it again takes the card out
 * again, but only while it has not been practised: reviewed cards keep their history.
 */
export default function AddToReviewButton({
  cardId,
  word,
  compact = false,
}: {
  cardId: string;
  /** The German word, used for the screen-reader label. */
  word?: string;
  compact?: boolean;
}) {
  const t = useTranslations("Review");
  const [ready, setReady] = useState(false);
  const card = useSrsStore((s) => s.cards[cardId]);
  const addCards = useSrsStore((s) => s.addCards);
  const removeCard = useSrsStore((s) => s.removeCard);

  useEffect(() => {
    let cancelled = false;
    void ensureSrsHydrated().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const inDeck = ready && card !== undefined;
  const kept = inDeck && !isNew(card);
  const size = compact ? "pill" : "btn btn-secondary";

  if (kept) {
    return (
      <span className={size + " cursor-default opacity-80"}>
        <span aria-hidden="true">✓ </span>
        {t("inDeckKept")}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={size}
      aria-label={!inDeck && word ? t("addAria", { word }) : undefined}
      onClick={() => (inDeck ? removeCard(cardId) : addCards([cardId]))}
    >
      <span aria-hidden="true">{inDeck ? "✓ " : "+ "}</span>
      {inDeck ? t("inDeck") : t("add")}
    </button>
  );
}
