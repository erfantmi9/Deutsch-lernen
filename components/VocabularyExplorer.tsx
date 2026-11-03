"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReviewCard, ReviewKind } from "@/lib/reviewCards";
import { useSrsStore } from "@/stores/srsStore";
import { VOCAB_CATEGORIES } from "@/types/vocab";
import { ADVERB_KINDS, PHRASE_SITUATIONS } from "@/types/vocab-extended";
import AddToReviewButton from "./AddToReviewButton";
import CardFront from "./CardFront";
import SpeakButton from "./SpeakButton";
import PageHeader from "./PageHeader";

type Locale = "en" | "fa" | "de";

/** Word types shown here. Verbs have their own page. */
const KINDS: readonly ReviewKind[] = ["noun", "adjective", "adverb", "preposition", "phrase"];

const GROUPS: Readonly<Partial<Record<ReviewKind, readonly string[]>>> = {
  noun: VOCAB_CATEGORIES,
  adverb: ADVERB_KINDS,
  preposition: ["akk", "dat", "wechsel"],
  phrase: PHRASE_SITUATIONS,
};

function WordCard({ card, locale }: { card: ReviewCard; locale: Locale }) {
  const t = useTranslations("Vocabulary");
  const tr = locale === "de" ? "en" : locale;
  const exampleTranslation = card.example?.[tr];
  return (
    <li className="card space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <CardFront card={card} />
          <p lang={tr}>{card.translations[tr]}</p>
        </div>
        <div className="flex items-center gap-2">
          <SpeakButton text={card.front} compact />
          <AddToReviewButton cardId={card.id} word={card.front} compact />
        </div>
      </div>
      {card.detail && (
        <p className="text-sm text-text-muted">
          {card.kind === "noun" ? `${t("plural")}: ` : card.kind === "phrase" ? `${t("reply")}: ` : ""}
          <bdi dir="ltr" lang="de" className="font-bold text-text">
            {card.detail}
          </bdi>
        </p>
      )}
      {card.example && (
        <p className="text-sm">
          <bdi dir="ltr" lang="de" className="font-semibold">
            {card.example.de}
          </bdi>
          {exampleTranslation && (
            <span lang={tr} className="block text-text-muted">
              {exampleTranslation}
            </span>
          )}
        </p>
      )}
    </li>
  );
}

const normalise = (s: string): string => s.toLowerCase().normalize("NFC");

export default function VocabularyExplorer({ cards }: { cards: readonly ReviewCard[] }) {
  const t = useTranslations("Vocabulary");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const [kind, setKind] = useState<ReviewKind>("noun");
  const [group, setGroup] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const addCards = useSrsStore((s) => s.addCards);
  const deckIds = useSrsStore((s) => s.cards);

  // Search results link here with ?kind=<kind>&q=<word>.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get("kind");
    const q = params.get("q");
    if (k && (KINDS as readonly string[]).includes(k)) setKind(k as ReviewKind);
    if (q) setQuery(q.replace(/^(der|die|das) /, ""));
  }, []);

  const groups = GROUPS[kind];

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    return cards.filter((c) => {
      if (c.kind !== kind) return false;
      if (group !== "all" && c.group !== group) return false;
      if (q === "") return true;
      return (
        normalise(c.front).includes(q) ||
        normalise(c.translations.en).includes(q) ||
        c.translations.fa.includes(q) ||
        (c.example !== undefined && normalise(c.example.de).includes(q))
      );
    });
  }, [cards, kind, group, query]);

  const missing = visible.filter((c) => deckIds[c.id] === undefined);

  const chooseKind = (next: ReviewKind) => {
    setKind(next);
    setGroup("all");
    setMessage(null);
  };

  const addAll = () => {
    if (missing.length === 0) {
      setMessage(t("allInDeck"));
      return;
    }
    const added = addCards(missing.map((c) => c.id));
    setMessage(t("addedAll", { count: added }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div role="group" aria-label={t("kindLabel")} className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => chooseKind(k)} className="pill">
            {t(`kinds.${k}`)}
          </button>
        ))}
      </div>

      {groups && (
        <div role="group" aria-label={t("groupLabel")} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={group === "all"} onClick={() => setGroup("all")} className="pill">
            {t("groupAll")}
          </button>
          {groups.map((g) => (
            <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className="pill">
              {t(`groups.${kind}.${g}`)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setMessage(null);
            }}
            placeholder={t("searchPlaceholder")}
            lang={tr}
            className="min-h-11 w-full rounded-full border-2 border-border bg-surface px-4 py-2 text-text outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
          />
        </label>
        <p className="text-sm font-bold text-text-muted">{t("count", { count: visible.length })}</p>
        <button type="button" onClick={addAll} disabled={visible.length === 0} className="btn btn-secondary">
          {t("addAll", { count: visible.length })}
        </button>
      </div>

      <div role="status" aria-live="polite" className="min-h-0">
        {message && (
          <p className="feedback-hint">
            {message}{" "}
            <Link href="/review" className="font-extrabold underline">
              {t("reviewLink")}
            </Link>
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="card p-5 text-text-muted">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((c) => (
            <WordCard key={c.id} card={c} locale={locale} />
          ))}
        </ul>
      )}

    </div>
  );
}
