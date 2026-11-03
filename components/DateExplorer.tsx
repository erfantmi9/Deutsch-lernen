"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { daysInMonth, spokenDate, spokenDateOn, todaySentence, writtenDate } from "@/lib/numbers";
import { calendar, monthName } from "@/lib/numbersData";
import CalendarSvg from "./CalendarSvg";

function Readout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-lg font-extrabold">
        <bdi dir="ltr" lang="de">
          {children}
        </bdi>
      </p>
    </div>
  );
}

/** Pick a month and a day on the calendar page and read the date aloud in every form. */
export default function DateExplorer() {
  const t = useTranslations("Numbers");
  const locale = useLocale() as "en" | "fa" | "de";
  const [month, setMonth] = useState(11);
  const [day, setDay] = useState(3);

  // Start on today's date (client only, so the server HTML stays the same for everyone).
  useEffect(() => {
    const now = new Date();
    setMonth(now.getMonth() + 1);
    setDay(now.getDate());
  }, []);

  const days = daysInMonth(month);
  const safeDay = Math.min(day, days);
  const name = monthName(month);
  const label = calendar.months[month - 1][locale === "de" ? "de" : locale];

  return (
    <section aria-labelledby="date-title" className="space-y-4">
      <h3 id="date-title" className="text-xl font-extrabold">
        {t("calendar.explorerTitle")}
      </h3>
      <div role="group" aria-label={t("calendar.pickMonth")} className="flex flex-wrap gap-2">
        {calendar.months.map((m, i) => (
          <button key={m.id} type="button" aria-pressed={month === i + 1} onClick={() => setMonth(i + 1)} className="pill">
            <bdi dir="ltr" lang="de">
              {m.de}
            </bdi>
          </button>
        ))}
      </div>
      <div className="card grid items-start gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <CalendarSvg
          days={days}
          day={safeDay}
          onSelect={setDay}
          groupLabel={t("calendar.calendarLabel", { month: label })}
          dayLabel={(d) => t("calendar.dayLabel", { day: d, month: label })}
          className="mx-auto w-full max-w-xs"
        />
        <div aria-live="polite" className="space-y-3">
          <Readout title={t("calendar.written")}>{writtenDate(safeDay, name)}</Readout>
          <Readout title={t("calendar.spoken")}>{spokenDate(safeDay, name)}</Readout>
          <Readout title={t("calendar.on")}>{spokenDateOn(safeDay, name)}</Readout>
          <Readout title={t("calendar.sentence")}>{todaySentence(safeDay, name)}</Readout>
        </div>
      </div>
      <p className="text-sm text-text-muted">{t("calendar.todayNote")}</p>
    </section>
  );
}
