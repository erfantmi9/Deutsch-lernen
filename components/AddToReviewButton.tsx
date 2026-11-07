"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { announce, retainAnnouncer } from "@/lib/announce";
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

  // Many of these buttons can share a page: they all announce through one shared live region (lib/announce).
  useEffect(() => retainAnnouncer(), []);

  const inDeck = ready && card !== undefined;
  const kept = inDeck && !isNew(card);
  const size = compact ? "pill" : "btn btn-secondary";

  // Both labels are stacked in one grid cell and the inactive one is invisible, so the button is always as wide as the
  // wider label (in every locale) and never changes size when toggled or when the deck loads.
  const labels = (
    <span className="grid">
      <span className={"col-start-1 row-start-1" + (inDeck ? " invisible" : "")} aria-hidden={inDeck || undefined}>
        <span aria-hidden="true">+ </span>
        {t("add")}
      </span>
      <span className={"col-start-1 row-start-1" + (inDeck ? "" : " invisible")} aria-hidden={!inDeck || undefined}>
        <span aria-hidden="true">✓ </span>
        {t("inDeck")}
      </span>
    </span>
  );

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
      // A stable name; the state is aria-pressed. Without a word, the visible label names it.
      aria-label={word ? t("addAria", { word }) : undefined}
      aria-pressed={inDeck}
      aria-busy={!ready || undefined}
      data-add-review=""
      onClick={() => {
        if (inDeck) {
          removeCard(cardId);
          announce(word ? t("announceRemoved", { word }) : t("announceRemovedPlain"));
        } else {
          addCards([cardId]);
          announce(word ? t("announceAdded", { word }) : t("announceAddedPlain"));
        }
      }}
    >
      {labels}
    </button>
  );
}
