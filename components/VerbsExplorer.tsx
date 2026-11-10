"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { filterVerbs, getAvailableCategories, getAvailableTypes, parseVerbCategory, parseVerbType, parseVerbUsage, sortByUsage } from "@/lib/verbs";
import { VERB_USAGES } from "@/types/verb";
import type { VerbCategory, VerbType, VerbUsage } from "@/types/verb";
import VerbDrill from "./VerbDrill";
import PageHeader from "./PageHeader";
import VerbsHeader from "./illustrations/headers/VerbsHeader";
import FilterBar from "./ui/FilterBar";

type TypeFilter = "all" | VerbType;

// One scrollable line per filter row (like the vocabulary page), so three rows still leave the list in view on a phone.
const PILL_ROW = "-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] [&>button]:shrink-0 [&>button]:whitespace-nowrap";

/**
 * Verb list. The type filter and practice mode live in the URL (?type=…&practice=1) so Back and shared links work.
 *
 * Reading the URL (useSearchParams) on a static page renders everything below the nearest Suspense boundary on the client
 * only. So the URL is read in this thin wrapper, and the page passes the view with no filter as the Suspense fallback:
 * the static HTML contains the full verb list, and the wrapper applies ?type= / ?practice= once it runs.
 */
export default function VerbsExplorer() {
  const params = useSearchParams();
  return (
    <VerbsExplorerView
      type={parseVerbType(params.get("type"))}
      topic={parseVerbCategory(params.get("topic"))}
      usage={parseVerbUsage(params.get("usage"))}
      practicing={params.get("practice") === "1"}
    />
  );
}

export function VerbsExplorerView({
  type,
  topic = null,
  usage = null,
  practicing,
}: {
  type: VerbType | null;
  topic?: VerbCategory | null;
  usage?: VerbUsage | null;
  practicing: boolean;
}) {
  const t = useTranslations("Verbs");
  const locale = useLocale() as "en" | "fa" | "de";
  const router = useRouter();

  const typeFilter: TypeFilter = type ?? "all";

  const types = useMemo(() => getAvailableTypes(), []);
  const topics = useMemo(() => getAvailableCategories(), []);
  // Most needed verbs first, so the top of the list (and a practice round) starts with what matters most.
  const visible = useMemo(
    () => sortByUsage(filterVerbs({ type: type ?? undefined, category: topic ?? undefined, usage: usage ?? undefined })),
    [type, topic, usage],
  );

  const query = (ty: VerbType | null, practice: boolean, to: VerbCategory | null = topic, us: VerbUsage | null = usage) => {
    const q: Record<string, string> = {};
    if (ty) q.type = ty;
    if (to) q.topic = to;
    if (us) q.usage = us;
    if (practice) q.practice = "1";
    return q;
  };
  const qs = type ? `?type=${type}` : "";

  if (practicing && visible.length > 0) {
    return <VerbDrill pool={visible} onExit={() => router.replace({ pathname: "/verbs", query: query(type, false) }, { scroll: false })} />;
  }

  const chip = (value: TypeFilter, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={typeFilter === value}
      onClick={() =>
        router.replace({ pathname: "/verbs", query: query(value === "all" ? null : value, false) }, { scroll: false })
      }
      className="pill"
    >
      {label}
    </button>
  );

  const topicChip = (value: VerbCategory | null, label: string) => (
    <button
      key={value ?? "all"}
      type="button"
      aria-pressed={topic === value}
      onClick={() => router.replace({ pathname: "/verbs", query: query(type, false, value) }, { scroll: false })}
      className="pill"
    >
      {label}
    </button>
  );

  const usageChip = (value: VerbUsage | null, label: string) => (
    <button
      key={value ?? "all"}
      type="button"
      aria-pressed={usage === value}
      onClick={() => router.replace({ pathname: "/verbs", query: query(type, false, topic, value) }, { scroll: false })}
      className="pill"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<VerbsHeader size="100%" />}
        actions={
          <button
            type="button"
            onClick={() => router.push({ pathname: "/verbs", query: query(type, true) })}
            disabled={visible.length === 0}
            className="btn btn-primary"
          >
            {t("practice")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </button>
        }
      />

      <FilterBar count={visible.length}>
        <div role="group" aria-label={t("filterByUsage")} className={PILL_ROW}>
          {usageChip(null, t("filterAllUsages"))}
          {VERB_USAGES.map((u) => usageChip(u, t(`usages.${u}`)))}
        </div>
        <div role="group" aria-label={t("filterByType")} className={PILL_ROW}>
          {chip("all", t("filterAll"))}
          {types.map((ty) => chip(ty, t(`types.${ty}`)))}
        </div>
        <div role="group" aria-label={t("filterByTopic")} className={PILL_ROW}>
          {topicChip(null, t("filterAllTopics"))}
          {topics.map((c) => topicChip(c, t(`categories.${c}`)))}
        </div>
      </FilterBar>

      {visible.length === 0 && (
        <div className="card space-y-3 p-5">
          <p className="text-text-muted">{t("empty")}</p>
          <button
            type="button"
            onClick={() => router.replace({ pathname: "/verbs", query: {} }, { scroll: false })}
            className="btn btn-secondary"
          >
            {t("filterAll")}
          </button>
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((v) => (
          <li key={v.id}>
            <Link
              href={`/verbs/${v.id}${qs}`}
              className="card block w-full p-4 text-start transition duration-150 hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="block text-xl font-extrabold">
                <bdi dir="ltr" lang="de">
                  {v.infinitive}
                </bdi>
              </span>
              <span className="block text-sm text-text-muted">{v.translations[locale === "de" ? "en" : locale]}</span>
              <span className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-block rounded-full bg-primary-soft px-3 py-0.5 text-xs font-extrabold uppercase text-primary">
                  {t(`types.${v.type}`)}
                </span>
                <span data-usage={v.usage} className="inline-block rounded-full bg-surface-2 px-3 py-0.5 text-xs font-bold text-text-muted">
                  {t(`usages.${v.usage}`)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
