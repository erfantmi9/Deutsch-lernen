"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cardinal, MAX_CARDINAL } from "@/lib/numbers";
import { calendar, cardinalWords, ordinalWords } from "@/lib/numbersData";
import type { CalendarItem } from "@/types/numbers";
import DateExplorer from "./DateExplorer";
import { useSettledValue } from "./ui/useSettledValue";

export type ReferenceSection = "numbers" | "ordinals" | "calendar";

const basic = cardinalWords.filter((c) => c.value <= 20);
const big = cardinalWords.filter((c) => c.value > 20 && (c.value % 10 === 0 || c.value === 1000));

function NumberGrid({
  items,
  label,
  prefix,
  suffix,
}: {
  items: readonly { value: number; word: string }[];
  label: string;
  /** Written before the German word, e.g. "der " for ordinals. */
  prefix?: string;
  /** Written after the digits, e.g. "." for ordinals. */
  suffix?: string;
}) {
  return (
    <ul aria-label={label} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {items.map(({ value, word }) => (
        <li key={value} className="rounded-2xl border border-border bg-surface p-3 text-center shadow-soft">
          <span className="block text-2xl font-extrabold tabular-nums text-primary">
            {value}
            {suffix}
          </span>
          <bdi dir="ltr" lang="de" className="font-bold">
            {prefix}
            {word}
          </bdi>
        </li>
      ))}
    </ul>
  );
}

function Converter() {
  const t = useTranslations("Numbers");
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const value = /^\d{1,4}$/u.test(trimmed) ? Number(trimmed) : null;
  const valid = value !== null && value <= MAX_CARDINAL;
  // Announced once typing pauses, not after every digit.
  const announcement = useSettledValue(valid ? cardinal(value) : trimmed.length > 0 ? t("cardinals.converterInvalid") : "");

  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-xl font-extrabold">{t("cardinals.converterTitle")}</h2>
      <label htmlFor="converter" className="block text-sm font-bold text-text-muted">
        {t("cardinals.converterLabel")}
      </label>
      <input
        id="converter"
        value={text}
        onChange={(e) => setText(e.target.value)}
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        maxLength={4}
        className="w-full rounded-full border-2 border-border bg-surface px-6 py-3 text-xl text-text shadow-soft outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
      />
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <p className="min-h-8 text-xl font-extrabold">
        {valid ? (
          <bdi dir="ltr" lang="de">
            {cardinal(value)}
          </bdi>
        ) : trimmed.length > 0 ? (
          <span className="text-sm font-semibold text-danger">{t("cardinals.converterInvalid")}</span>
        ) : null}
      </p>
    </div>
  );
}

function CalendarList({ title, items, locale }: { title: string; items: readonly CalendarItem[]; locale: "en" | "fa" | "de" }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xl font-extrabold">{title}</h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-border bg-surface p-3 shadow-soft">
            <bdi dir="ltr" lang="de" className="block font-extrabold">
              <span className="text-der">der</span> {item.de}
            </bdi>
            <span className="block text-sm text-text-muted">{item[locale === "de" ? "en" : locale]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The learn tabs: cardinals (with converter), ordinals, and months / weekdays / seasons with the date explorer. */
export default function NumbersReference({ section }: { section: ReferenceSection }) {
  const t = useTranslations("Numbers");
  const locale = useLocale() as "en" | "fa" | "de";

  if (section === "numbers") {
    return (
      <div className="space-y-6">
        {/* The converter is the tool people come for: first, before the reference lists. */}
        <Converter />
        <section className="card space-y-2 p-5">
          <h2 className="text-xl font-extrabold">{t("cardinals.ruleTitle")}</h2>
          <p className="leading-relaxed">{t("cardinals.rule")}</p>
          <p className="text-sm leading-relaxed text-text-muted">{t("cardinals.hundredNote")}</p>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">{t("cardinals.basicTitle")}</h2>
          <NumberGrid items={basic} label={t("cardinals.basicTitle")} />
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-extrabold">{t("cardinals.bigTitle")}</h2>
          <NumberGrid items={big} label={t("cardinals.bigTitle")} />
        </section>
      </div>
    );
  }

  if (section === "ordinals") {
    return (
      <div className="space-y-6">
        <section className="card space-y-2 p-5">
          <h2 className="text-xl font-extrabold">{t("ordinals.title")}</h2>
          <p className="leading-relaxed">{t("ordinals.rule")}</p>
          <p className="text-sm text-text-muted">{t("ordinals.written")}</p>
        </section>
        <NumberGrid
          items={ordinalWords.map((o) => ({ value: o.value, word: o.word }))}
          label={t("ordinals.listLabel")}
          prefix="der "
          suffix="."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <DateExplorer />
      <p className="feedback-hint">{t("calendar.articleNote")}</p>
      <CalendarList title={t("calendar.monthsTitle")} items={calendar.months} locale={locale} />
      <CalendarList title={t("calendar.weekdaysTitle")} items={calendar.weekdays} locale={locale} />
      <CalendarList title={t("calendar.seasonsTitle")} items={calendar.seasons} locale={locale} />
    </div>
  );
}
