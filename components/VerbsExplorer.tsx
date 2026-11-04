"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { filterVerbs, getAvailableTypes, parseVerbType, verbs } from "@/lib/verbs";
import type { VerbType } from "@/types/verb";
import VerbDrill from "./VerbDrill";
import PageHeader from "./PageHeader";
import VerbsHeader from "./illustrations/headers/VerbsHeader";
import FilterBar from "./ui/FilterBar";

type TypeFilter = "all" | VerbType;

/** Verb list. The type filter and practice mode live in the URL (?type=…&practice=1) so Back and shared links work. */
export default function VerbsExplorer() {
  const t = useTranslations("Verbs");
  const locale = useLocale() as "en" | "fa" | "de";
  const router = useRouter();
  const params = useSearchParams();

  const type = parseVerbType(params.get("type"));
  const typeFilter: TypeFilter = type ?? "all";
  const practicing = params.get("practice") === "1";

  const types = useMemo(() => getAvailableTypes(), []);
  const visible = useMemo(() => (type ? filterVerbs({ type }) : [...verbs]), [type]);

  const query = (ty: VerbType | null, practice: boolean) => {
    const q: Record<string, string> = {};
    if (ty) q.type = ty;
    if (practice) q.practice = "1";
    return q;
  };
  const qs = type ? `?type=${type}` : "";

  if (practicing) {
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
            className="btn btn-primary"
          >
            {t("practice")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </button>
        }
      />

      <FilterBar count={visible.length}>
        <div role="group" aria-label={t("filterByType")} className="flex flex-wrap gap-2">
          {chip("all", t("filterAll"))}
          {types.map((ty) => chip(ty, t(`types.${ty}`)))}
        </div>
      </FilterBar>

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
              <span className="mt-2 inline-block rounded-full bg-primary-soft px-3 py-0.5 text-xs font-extrabold uppercase text-primary">
                {t(`types.${v.type}`)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
