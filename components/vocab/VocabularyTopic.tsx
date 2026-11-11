"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReviewCard } from "@/lib/reviewCards";
import { cardSubgroup, deckPercent, getTopic, searchCards, subgroupLabelKey, topicLabelKey } from "@/lib/vocabTopics";
import type { TopicId } from "@/lib/vocabTopics";
import AnnounceHost from "../ui/AnnounceHost";
import { BackIcon, BulbIcon, SearchIcon } from "./icons";
import { NothingFound, SearchField } from "./parts";
import { useDeck } from "./useDeck";
import WordRow from "./WordRow";

const ALL = "all";

/** "hell", "dunkel" and the example word in the colour tip are German. */
const german = (chunks: ReactNode) => (
  <bdi dir="ltr" lang="de" className="font-extrabold">
    {chunks}
  </bdi>
);

/**
 * One topic's word list: back link, name and review share, sub-topic pills and a search (behind an icon on phones).
 * Each word opens in place for its plural, an example and the add-to-review button. The mustard bar at the bottom
 * starts a practice round with the words currently selected by the pills.
 */
export default function VocabularyTopic({ topicId, cards }: { topicId: TopicId; cards: readonly ReviewCard[] }) {
  const t = useTranslations("Vocabulary");
  const locale = useLocale();
  const tr = locale === "fa" ? "fa" : "en";
  const topic = useMemo(() => getTopic(topicId)!, [topicId]);
  const name = t(topicLabelKey(topic));
  const deck = useDeck();

  const [sub, setSub] = useState(ALL);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const mobileSearch = useRef<HTMLInputElement>(null);
  const desktopSearch = useRef<HTMLInputElement>(null);

  // Only offer sub-topics that have words.
  const subs = useMemo(() => topic.subgroups.filter((s) => cards.some((c) => cardSubgroup(c) === s)), [topic, cards]);

  // Links can open a sub-topic (?sub=) or a word (?q=, from search results and the progress page).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("sub");
    const q = params.get("q");
    if (s && subs.includes(s)) setSub(s);
    if (q) {
      setQuery(q);
      setSearchOpen(true);
    }
  }, [subs]);

  useEffect(() => {
    if (searchOpen) mobileSearch.current?.focus();
  }, [searchOpen]);

  const inSub = useMemo(() => (sub === ALL ? [...cards] : cards.filter((c) => cardSubgroup(c) === sub)), [cards, sub]);
  const visible = useMemo(() => searchCards(inSub, query), [inSub, query]);
  const percent = deck ? deckPercent(cards.map((c) => c.id), deck) : null;

  const changeQuery = (q: string) => {
    setQuery(q);
    setOpenId(null);
  };
  const clearSearch = () => {
    setQuery("");
    (window.matchMedia("(min-width: 640px)").matches ? desktopSearch : mobileSearch).current?.focus();
  };

  const practiceHref = `/vocabulary/${topic.id}/practice${sub === ALL ? "" : `?sub=${encodeURIComponent(sub)}`}`;
  const stats = t("count", { count: cards.length });

  return (
    <div className="space-y-4">
      <div className="sticky top-header z-20 -mx-4 -mt-6 space-y-3 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur short:-mt-3">
        <div className="flex items-center gap-3">
          <Link
            href="/vocabulary"
            aria-label={t("back")}
            title={t("back")}
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-text transition hover:bg-surface-2 sm:border sm:border-border sm:bg-surface sm:shadow-soft"
          >
            <BackIcon />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-extrabold leading-tight sm:text-3xl">{name}</h1>
            <p className="text-sm text-text-muted">
              {percent === null ? stats : t("topicStats", { words: stats, review: t("inReview", { percent }) })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-expanded={searchOpen}
            aria-label={t("openSearch")}
            className={
              "flex size-11 shrink-0 items-center justify-center rounded-full transition hover:bg-surface-2 sm:hidden " +
              (searchOpen ? "bg-primary-soft text-primary" : "text-text")
            }
          >
            <SearchIcon size={24} />
          </button>
          <SearchField
            inputRef={desktopSearch}
            value={query}
            onChange={changeQuery}
            placeholder={t("searchTopic", { topic: name })}
            label={t("searchTopic", { topic: name })}
            lang={tr}
            className="hidden w-80 shrink-0 sm:block"
          />
        </div>

        {searchOpen && (
          <SearchField
            inputRef={mobileSearch}
            value={query}
            onChange={changeQuery}
            placeholder={t("searchTopic", { topic: name })}
            label={t("searchTopic", { topic: name })}
            lang={tr}
            className="sm:hidden"
          />
        )}

        {subs.length > 0 && (
          <div
            role="group"
            aria-label={t("subgroupLabel")}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap"
          >
            {[ALL, ...subs].map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={sub === s}
                onClick={() => {
                  setSub(s);
                  setOpenId(null);
                }}
                className="pill min-h-12 px-5 text-base"
              >
                {s === ALL ? t("subgroupAll") : t(subgroupLabelKey(topic, s))}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The page's one live region: how many words the pills and the search leave. */}
      <p role="status" aria-live="polite" className="sr-only">
        {t("count", { count: visible.length })}
        <AnnounceHost />
      </p>

      {topic.id === "adjectives" && sub === "color" && (
        <div className="flex items-start gap-3 rounded-3xl border border-brand/70 bg-brand/15 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-on-brand">
            <BulbIcon />
          </span>
          <p className="leading-loose">{t.rich("colorTip", { b: german })}</p>
        </div>
      )}

      {visible.length > 0 ? (
        <ul className="grid items-start gap-2 lg:grid-cols-2 lg:gap-3">
          {visible.map((c) => (
            <WordRow
              key={c.id}
              card={c}
              tr={tr}
              open={openId === c.id}
              onToggle={() => setOpenId(openId === c.id ? null : c.id)}
              inDeck={deck?.[c.id] !== undefined}
            />
          ))}
        </ul>
      ) : (
        <NothingFound message={t("empty")}>
          <button type="button" onClick={clearSearch} className="btn-ghost text-base font-extrabold text-primary">
            {t("clearSearch")}
          </button>
        </NothingFound>
      )}

      {/* Room for the practice bar, which floats above the bottom navigation on phones. */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
      <div className="fixed inset-x-0 bottom-bottom-chrome z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur lg:sticky lg:bottom-0 lg:-mx-4 lg:mt-8 lg:py-4">
        <Link
          href={practiceHref}
          aria-label={t("practiceCtaAria", { count: inSub.length })}
          data-practice-link=""
          className="mx-auto flex min-h-14 max-w-xl items-center gap-3 rounded-3xl bg-brand px-5 py-3 text-lg font-extrabold text-on-brand shadow-lift transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-brand/40"
        >
          <span className="flex-1 text-center">{t("practiceCta")}</span>
          <span className="shrink-0 rounded-full bg-on-brand/10 px-3 py-1 text-sm">{t("count", { count: inSub.length })}</span>
        </Link>
      </div>
    </div>
  );
}
