"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import type { ReviewCard } from "@/lib/reviewCards";
import { COLOR_SWATCH, colorCompound } from "@/lib/vocabTopics";
import type { Article } from "@/types/vocab";
import AddToReviewButton from "../AddToReviewButton";
import SpeakButton from "../SpeakButton";
import { CheckCircleIcon } from "./icons";

type Tr = "en" | "fa";

const BADGE: Readonly<Record<Article, string>> = {
  der: "border-der bg-der/10 text-der-ink",
  die: "border-die bg-die/10 text-die-ink",
  das: "border-das bg-das/10 text-das-ink",
};

/** The article as a small outlined tag. Plural-only nouns get a neutral dashed one: their "die" is the plural's. */
export function ArticleBadge({ article, pluralOnly = false }: { article: string; pluralOnly?: boolean }) {
  const tone = pluralOnly || !(article in BADGE) ? "border-dashed border-text-muted/60 text-text-muted" : BADGE[article as Article];
  return <span className={"shrink-0 rounded-lg border-2 px-1.5 text-sm font-extrabold leading-6 " + tone}>{article}</span>;
}

/** German side of a row: article tag + word for nouns, the plain word or phrase for everything else. */
export function GermanWord({ card, className = "text-lg" }: { card: ReviewCard; className?: string }) {
  if (card.kind !== "noun") {
    return (
      <bdi dir="ltr" lang="de" className={"hyphens-auto break-words font-extrabold " + className}>
        {card.front}
      </bdi>
    );
  }
  const [article, ...rest] = card.front.split(" ");
  return (
    <span dir="ltr" lang="de" className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
      <ArticleBadge article={article} pluralOnly={card.pluralOnly} />
      <span className={"min-w-0 hyphens-auto break-words font-extrabold " + className}>{rest.join(" ")}</span>
    </span>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-9 shrink-0 rounded-full border-2 border-text/20"
      style={{ background: color }}
    />
  );
}

const DETAIL_LABEL: Partial<Record<ReviewCard["kind"], string>> = {
  noun: "plural",
  adjective: "comparison",
  preposition: "caseLabel",
  phrase: "reply",
};

/**
 * One word in a topic list. The row is a disclosure button: open, it shows the plural (or other key form), an example
 * and the add-to-review button. The tick shows the word is already in the review deck; the speaker reads it aloud.
 */
export default function WordRow({
  card,
  tr,
  open,
  onToggle,
  inDeck,
}: {
  card: ReviewCard;
  tr: Tr;
  open: boolean;
  onToggle: () => void;
  inDeck: boolean;
}) {
  const t = useTranslations("Vocabulary");
  const panelId = useId();
  const adjectiveId = card.kind === "adjective" ? card.id.slice(card.id.indexOf(":") + 1) : undefined;
  const swatch = adjectiveId !== undefined ? COLOR_SWATCH[adjectiveId] : undefined;
  const compound = swatch ? colorCompound(card.front) : null;
  const detailLabel = DETAIL_LABEL[card.kind];
  const exampleTranslation = card.example?.[tr];

  return (
    <li
      data-word-row=""
      className={
        "rounded-3xl border bg-surface shadow-soft transition-colors " + (open ? "border-primary" : "border-border")
      }
    >
      <div className="flex items-center gap-1 py-1.5 pe-2 ps-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={onToggle}
          className="grid min-h-14 min-w-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center gap-3 rounded-2xl py-1.5 text-start outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
        >
          <span className="flex min-w-0 items-center gap-3">
            {swatch && <Swatch color={swatch} />}
            <span className="flex min-w-0 flex-col items-start gap-1">
              <GermanWord card={card} className="text-[1.0625rem]" />
              {card.pluralOnly && (
                <span className="rounded-lg bg-surface-2 px-2 text-xs font-bold leading-6 text-text-muted">{t("pluralOnly")}</span>
              )}
            </span>
          </span>
          <span className="min-w-0">
            <span lang={tr} className="block">
              {card.translations[tr]}
            </span>
            {compound && (
              <bdi dir="ltr" lang="de" className="block text-sm text-text-muted">
                {compound[0]} + {compound[1]}
              </bdi>
            )}
          </span>
        </button>
        <span className="flex w-8 shrink-0 items-center justify-center text-primary">
          {inDeck && (
            <>
              <CheckCircleIcon />
              <span className="sr-only">{t("inDeckMark")}</span>
            </>
          )}
        </span>
        <SpeakButton text={card.front} plain />
      </div>

      {open && (
        <div id={panelId} className="mx-4 space-y-3 border-t border-border pb-4 pt-3">
          {card.detail && detailLabel && (
            <p className="text-sm text-text-muted">
              {t(detailLabel)}:{" "}
              <bdi dir="ltr" lang="de" className="text-base font-extrabold text-text">
                {card.detail}
              </bdi>
            </p>
          )}
          {card.example && (
            <div className="space-y-1 rounded-2xl bg-surface-2 p-4">
              <p dir="ltr" lang="de" className="text-start font-semibold">
                {card.example.de}
              </p>
              {exampleTranslation && (
                <p lang={tr} className="text-sm text-text-muted">
                  {exampleTranslation}
                </p>
              )}
            </div>
          )}
          <AddToReviewButton cardId={card.id} word={card.front} block />
        </div>
      )}
    </li>
  );
}
