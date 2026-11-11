"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReviewCard, ReviewKind } from "@/lib/reviewCards";
import { useSrsStore } from "@/stores/srsStore";
import { VOCAB_CATEGORIES, VOCAB_SUBCATEGORIES } from "@/types/vocab";
import type { VocabCategory } from "@/types/vocab";
import { ADVERB_KINDS, PHRASE_SITUATIONS } from "@/types/vocab-extended";
import AddToReviewButton from "./AddToReviewButton";
import CardFront from "./CardFront";
import SpeakButton from "./SpeakButton";
import PageHeader from "./PageHeader";
import ConfirmDialog from "./ui/ConfirmDialog";
import FilterBar from "./ui/FilterBar";

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
      {card.pluralOnly && <p className="text-sm text-text-muted">{t("pluralOnly")}</p>}
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
  const tUi = useTranslations("Ui");
  const [askAddAll, setAskAddAll] = useState(false);
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const [kind, setKind] = useState<ReviewKind>("noun");
  const [group, setGroup] = useState<string>("all");
  const [subgroup, setSubgroup] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const addCards = useSrsStore((s) => s.addCards);
  const deckIds = useSrsStore((s) => s.cards);
  const searchInput = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  // The add-all result is not a live region (the "Showing N" count is this page's only one). Focus moves to it
  // instead, after the confirm dialog has returned focus to its trigger, so screen readers read it.
  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => messageRef.current?.focus(), 50);
  };

  // Search results link here with ?kind=<kind>&q=<word>. Shared links can also open a topic:
  // ?kind=noun&group=family&subgroup=relatives (kind defaults to noun).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const k = params.get("kind");
    const q = params.get("q");
    const g = params.get("group");
    const sg = params.get("subgroup");
    const nextKind = k && (KINDS as readonly string[]).includes(k) ? (k as ReviewKind) : "noun";
    if (k && nextKind === k) setKind(nextKind);
    if (g && GROUPS[nextKind]?.includes(g)) {
      setGroup(g);
      const subs = nextKind === "noun" ? VOCAB_SUBCATEGORIES[g as VocabCategory] : undefined;
      if (sg && subs?.includes(sg)) setSubgroup(sg);
    }
    if (q) setQuery(q.replace(/^(der|die|das) /, ""));
  }, []);

  const groups = GROUPS[kind];
  const subgroups = kind === "noun" && group !== "all" ? VOCAB_SUBCATEGORIES[group as VocabCategory] : undefined;

  const chooseGroup = (next: string) => {
    setGroup(next);
    setSubgroup("all");
  };

  const visible = useMemo(() => {
    const q = normalise(query.trim());
    return cards.filter((c) => {
      if (c.kind !== kind) return false;
      if (group !== "all" && c.group !== group) return false;
      if (subgroup !== "all" && c.subgroup !== subgroup) return false;
      if (q === "") return true;
      return (
        normalise(c.front).includes(q) ||
        normalise(c.translations.en).includes(q) ||
        c.translations.fa.includes(q) ||
        (c.example !== undefined && normalise(c.example.de).includes(q))
      );
    });
  }, [cards, kind, group, subgroup, query]);

  const missing = visible.filter((c) => deckIds[c.id] === undefined);

  const chooseKind = (next: ReviewKind) => {
    setKind(next);
    setGroup("all");
    setSubgroup("all");
    setMessage(null);
  };

  const addAll = () => {
    if (missing.length === 0) {
      showMessage(t("allInDeck"));
      return;
    }
    setAskAddAll(true);
  };
  const confirmAddAll = () => {
    setAskAddAll(false);
    const added = addCards(missing.map((c) => c.id));
    showMessage(t("addedAll", { count: added }));
  };

  const clearFilters = () => {
    setKind("noun");
    setGroup("all");
    setSubgroup("all");
    setQuery("");
    setMessage(null);
    searchInput.current?.focus();
  };

  const pillRow = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap";

  return (
    <div className="space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <FilterBar count={visible.length}>
        <div role="group" aria-label={t("kindLabel")} className={pillRow}>
          {KINDS.map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => chooseKind(k)} className="pill">
              {t(`kinds.${k}`)}
            </button>
          ))}
        </div>

        {groups && (
          <div role="group" aria-label={t("groupLabel")} className={pillRow}>
            <button type="button" aria-pressed={group === "all"} onClick={() => chooseGroup("all")} className="pill">
              {t("groupAll")}
            </button>
            {groups.map((g) => (
              <button key={g} type="button" aria-pressed={group === g} onClick={() => chooseGroup(g)} className="pill">
                {t(`groups.${kind}.${g}`)}
              </button>
            ))}
          </div>
        )}

        {subgroups && (
          <div role="group" aria-label={t("subgroupLabel")} className={pillRow}>
            <button type="button" aria-pressed={subgroup === "all"} onClick={() => setSubgroup("all")} className="pill">
              {t("subgroupAll")}
            </button>
            {subgroups.map((s) => (
              <button key={s} type="button" aria-pressed={subgroup === s} onClick={() => setSubgroup(s)} className="pill">
                {t(`subgroups.${group}.${s}`)}
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="sr-only">{t("searchLabel")}</span>
          <input
            ref={searchInput}
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
      </FilterBar>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={addAll} disabled={visible.length === 0} aria-haspopup="dialog" className="btn btn-secondary">
          {t("addAll", { count: visible.length })}
        </button>
        {message && (
          <p ref={messageRef} tabIndex={-1} data-testid="add-all-result" className="feedback-hint flex-1 outline-none">
            {message}{" "}
            <Link href="/review" className="font-extrabold underline">
              {t("reviewLink")}
            </Link>
          </p>
        )}
      </div>

      <ConfirmDialog
        open={askAddAll}
        title={tUi("addAllTitle", { count: missing.length })}
        message={tUi("addAllMessage")}
        confirmLabel={tUi("addAllAction")}
        tone="primary"
        onCancel={() => setAskAddAll(false)}
        onConfirm={confirmAddAll}
      />

      {visible.length === 0 ? (
        <div className="card space-y-3 p-5">
          <p className="text-text-muted">{t("empty")}</p>
          <button type="button" onClick={clearFilters} className="btn btn-secondary">
            {tUi("clearFilters")}
          </button>
        </div>
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
