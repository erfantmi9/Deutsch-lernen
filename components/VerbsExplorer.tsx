"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { filterVerbs, getAvailableTypes, verbs } from "@/lib/verbs";
import type { VerbType } from "@/types/verb";
import VerbTable from "./VerbTable";
import VerbDrill from "./VerbDrill";
import PageHeader from "./PageHeader";
import VerbsHeader from "./illustrations/headers/VerbsHeader";

type TypeFilter = "all" | VerbType;

export default function VerbsExplorer() {
  const t = useTranslations("Verbs");
  const locale = useLocale() as "en" | "fa" | "de";

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [practicing, setPracticing] = useState(false);

  const types = useMemo(() => getAvailableTypes(), []);
  const visible = useMemo(
    () => (typeFilter === "all" ? [...verbs] : filterVerbs({ type: typeFilter })),
    [typeFilter],
  );
  const selected = visible.find((v) => v.id === selectedId) ?? null;

  if (practicing) {
    return <VerbDrill pool={visible} onExit={() => setPracticing(false)} />;
  }

  const chip = (value: TypeFilter, label: string) => (
    <button
      key={value}
      type="button"
      aria-pressed={typeFilter === value}
      onClick={() => setTypeFilter(value)}
      className="pill"
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<VerbsHeader size="100%" />}
        actions={
          <button type="button" onClick={() => setPracticing(true)} className="btn btn-primary">
            {t("practice")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </button>
        }
      />

      <div role="group" aria-label={t("filterByType")} className="flex flex-wrap gap-2">
        {chip("all", t("filterAll"))}
        {types.map((ty) => chip(ty, t(`types.${ty}`)))}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((v) => {
          const isSel = v.id === selected?.id;
          return (
            <li key={v.id}>
              <button
                type="button"
                aria-pressed={isSel}
                onClick={() => setSelectedId(isSel ? null : v.id)}
                className={
                  "card w-full p-4 text-start transition duration-150 hover:-translate-y-0.5 hover:shadow-lift " +
                  (isSel ? "border-primary ring-2 ring-primary" : "")
                }
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
              </button>
            </li>
          );
        })}
      </ul>

      {selected && <VerbTable key={selected.id} verb={selected} />}
    </div>
  );
}
