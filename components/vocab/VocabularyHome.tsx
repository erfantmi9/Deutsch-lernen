"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { ReviewCard } from "@/lib/reviewCards";
import { deckPercent, getTopic, searchCards, TOPIC_IDS, topicCards, topicLabelKey, WORD_TYPE_TOPICS } from "@/lib/vocabTopics";
import type { Topic, TopicId } from "@/lib/vocabTopics";
import { VOCAB_CATEGORIES } from "@/types/vocab";
import AnnounceHost from "../ui/AnnounceHost";
import { NothingFound, SearchField, TopicCard } from "./parts";
import { useDeck } from "./useDeck";
import WordRow from "./WordRow";

/** Topics offered when a search finds nothing. */
const SUGGESTED: readonly TopicId[] = ["family", "home", "shopping"];
/** A search can match a large part of the dictionary; the list stops here (the count says how many there are). */
const MAX_RESULTS = 80;

const topicOf = (id: TopicId): Topic => getTopic(id)!;

/**
 * Vocabulary start page: a grid of topics (noun categories, then word types), each opening its own word list.
 * Typing in the search replaces the grid with matching words from every topic.
 */
export default function VocabularyHome({ cards }: { cards: readonly ReviewCard[] }) {
  const t = useTranslations("Vocabulary");
  const locale = useLocale();
  const tr = locale === "fa" ? "fa" : "en";
  const router = useRouter();
  const deck = useDeck();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Older links: ?kind=<kind>&q=<word> (search, progress page) searches; ?group=<category>[&subgroup=] opens the topic.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const group = params.get("group");
    if (group && (VOCAB_CATEGORIES as readonly string[]).includes(group)) {
      const sub = params.get("subgroup");
      router.replace(`/vocabulary/${group}${sub ? `?sub=${encodeURIComponent(sub)}` : ""}`);
      return;
    }
    const q = params.get("q");
    if (q) setQuery(q);
  }, [router]);

  const ids = useMemo(
    () => new Map(TOPIC_IDS.map((id) => [id, topicCards(cards, topicOf(id)).map((c) => c.id)] as const)),
    [cards],
  );

  const searching = query.trim() !== "";
  const results = useMemo(() => (searching ? searchCards(cards, query) : []), [cards, query, searching]);

  const card = (id: TopicId, compact = false) => {
    const list = ids.get(id) ?? [];
    return (
      <TopicCard
        key={id}
        topic={id}
        name={t(topicLabelKey(topicOf(id)))}
        count={list.length}
        percent={deck ? deckPercent(list, deck) : null}
        compact={compact}
      />
    );
  };

  const clear = () => {
    setQuery("");
    searchRef.current?.focus();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <header className="space-y-1">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t("title")}</h1>
          <p className="text-text-muted">{t("subtitle")}</p>
        </header>
        <SearchField
          inputRef={searchRef}
          value={query}
          onChange={(v) => {
            setQuery(v);
            setOpenId(null);
          }}
          placeholder={t("searchPlaceholder")}
          label={t("searchLabel")}
          lang={tr}
          className="lg:w-[26rem] lg:shrink-0"
        />
      </div>

      {/* The page's one live region: the number of words found (empty while browsing topics). */}
      <p role="status" aria-live="polite" className={searching && results.length > 0 ? "text-sm text-text-muted" : "sr-only"}>
        {searching ? (results.length > 0 ? t("results", { count: results.length }) : t("empty")) : ""}
        <AnnounceHost />
      </p>

      {searching ? (
        results.length > 0 ? (
          <ul className="grid gap-2 lg:grid-cols-2">
            {results.slice(0, MAX_RESULTS).map((c) => (
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
            <p className="mt-4 text-sm text-text-muted">{t("tryTopics")}</p>
            <ul className="flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((id) => (
                <li key={id}>
                  <Link href={`/vocabulary/${id}`} className="pill text-base text-text">
                    {t(topicLabelKey(topicOf(id)))}
                  </Link>
                </li>
              ))}
            </ul>
            <button type="button" onClick={clear} className="btn-ghost mt-2 text-base font-extrabold text-primary">
              {t("clearSearch")}
            </button>
          </NothingFound>
        )
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{VOCAB_CATEGORIES.map((id) => card(id))}</ul>
          <section aria-labelledby="word-types" className="space-y-3 pt-2">
            <h2 id="word-types" className="text-xl font-extrabold">
              {t("kindLabel")}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{WORD_TYPE_TOPICS.map((id) => card(id, true))}</ul>
          </section>
        </>
      )}
    </div>
  );
}
