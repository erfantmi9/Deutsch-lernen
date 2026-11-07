"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { daysInMonth, spokenDate, spokenDateOn, todaySentence, writtenDate } from "@/lib/numbers";
import { calendar, monthName } from "@/lib/numbersData";
import CalendarSvg from "./CalendarSvg";
import { useSettledValue } from "./ui/useSettledValue";

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
  // Set by the learner's own taps only, so today's date (set on mount) is not announced.
  const [touched, setTouched] = useState(false);
  const pickMonth = (m: number) => {
    setTouched(true);
    setMonth(m);
  };
  const pickDay = (d: number) => {
    setTouched(true);
    setDay(d);
  };
  // One announcement per settled choice, not one per tap / arrow key.
  const announcement = useSettledValue(touched ? spokenDate(safeDay, name) : "");
  const rows: [string, string][] = [
    [t("calendar.written"), writtenDate(safeDay, name)],
    [t("calendar.spoken"), spokenDate(safeDay, name)],
    [t("calendar.on"), spokenDateOn(safeDay, name)],
    [t("calendar.sentence"), todaySentence(safeDay, name)],
  ];

  return (
    <section aria-labelledby="date-title" className="space-y-4">
      <h3 id="date-title" className="text-xl font-extrabold">
        {t("calendar.explorerTitle")}
      </h3>
      {/* Sticky readout: stays in view while picking a month or tapping days. Not a live region (see below). */}
      <dl data-readout className="sticky top-[calc(var(--header-h)+0.5rem)] z-10 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm shadow-soft">
        {rows.map(([title, value]) => (
          <div key={title} className="contents">
            <dt className="eyebrow">{title}</dt>
            <dd className="font-extrabold">
              <bdi dir="ltr" lang="de">
                {value}
              </bdi>
            </dd>
          </div>
        ))}
      </dl>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div role="group" aria-label={t("calendar.pickMonth")} className="flex flex-wrap gap-2">
        {calendar.months.map((m, i) => (
          <button key={m.id} type="button" aria-pressed={month === i + 1} onClick={() => pickMonth(i + 1)} className="pill">
            <bdi dir="ltr" lang="de">
              {m.de}
            </bdi>
          </button>
        ))}
      </div>
      <div className="card p-5 sm:p-6">
        <CalendarSvg
          days={days}
          day={safeDay}
          onSelect={pickDay}
          groupLabel={t("calendar.calendarLabel", { month: label })}
          dayLabel={(d) => t("calendar.dayLabel", { day: d, month: label })}
          className="mx-auto w-full max-w-xs"
        />
      </div>
      <p className="text-sm text-text-muted">{t("calendar.todayNote")}</p>
    </section>
  );
}
