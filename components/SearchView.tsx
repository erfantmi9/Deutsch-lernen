"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MIN_QUERY_LENGTH, searchItems } from "@/lib/search";
import type { SearchItem } from "@/lib/search";
import PageHeader from "./PageHeader";

const GERMAN_KINDS = new Set(["noun", "verb", "adjective", "adverb", "preposition", "phrase"]);

export default function SearchView({ items }: { items: readonly SearchItem[] }) {
  const t = useTranslations("Search");
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setQuery(q);
    input.current?.focus();
  }, []);

  // Write the query back to the URL (debounced, replace, not push) so Back from a result restores these results.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const q = query.trim();
      if ((url.searchParams.get("q") ?? "") === q) return;
      if (q) url.searchParams.set("q", q);
      else url.searchParams.delete("q");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }, 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const results = useMemo(() => searchItems(items, query), [items, query]);
  const active = query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="block space-y-1">
          <span className="sr-only">{t("label")}</span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            autoComplete="off"
            className="min-h-12 w-full rounded-full border-2 border-border bg-surface px-5 py-2 text-lg outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
          />
        </label>
      </form>

      <p className="text-sm font-bold text-text-muted" role="status" aria-live="polite">
        {!active ? t("hint", { min: MIN_QUERY_LENGTH }) : results.length === 0 ? t("none") : t("count", { count: results.length })}
      </p>

      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.id}>
            <Link href={r.href} className="card flex min-h-14 flex-wrap items-center justify-between gap-2 p-4 transition hover:bg-surface-2">
              <span className="min-w-0">
                <bdi dir={GERMAN_KINDS.has(r.kind) ? "ltr" : undefined} lang={GERMAN_KINDS.has(r.kind) ? "de" : undefined} className="block font-extrabold">
                  {r.title}
                </bdi>
                {r.sub && <span className="block truncate text-sm text-text-muted">{r.sub}</span>}
              </span>
              <span className="rounded-full bg-primary-soft px-3 py-0.5 text-xs font-extrabold text-primary">{t(`kinds.${r.kind}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
