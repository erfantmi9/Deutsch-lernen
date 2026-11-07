"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ClockExplorer from "./ClockExplorer";
import NumbersDrill from "./NumbersDrill";
import NumbersReference from "./NumbersReference";
import PageHeader from "./PageHeader";

const TABS = ["numbers", "ordinals", "calendar", "clock", "practice"] as const;
type Tab = (typeof TABS)[number];

/** /numbers: learn tabs (numbers, ordinals, calendar, clock) and the practice drills. */
export default function NumbersExplorer() {
  const t = useTranslations("Numbers");
  const [tab, setTab] = useState<Tab>("numbers");

  return (
    <div className="space-y-4">
      {/* The practice drill is this page's main task: title only at every size, so the question fits above the fold. */}
      <PageHeader title={t("title")} compact="always" />

      <div role="group" aria-label={t("tabsLabel")} className="flex flex-wrap gap-2">
        {TABS.map((id) => (
          <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)} className="pill">
            {t(`tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === "clock" ? (
        <ClockExplorer />
      ) : tab === "practice" ? (
        <NumbersDrill />
      ) : (
        <NumbersReference section={tab} />
      )}
    </div>
  );
}
