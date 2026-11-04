"use client";

import { useId, useState } from "react";
import { useSettledValue } from "./ui/useSettledValue";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { colloquialVariants, formatClock, officialTime } from "@/lib/numbers";
import type { ClockTime } from "@/types/numbers";
import AnalogClock from "./AnalogClock";

/** Hour and minute sliders: the accessible way to set a clock (the pointer on the face is a bonus). */
export function ClockSliders({
  time,
  onChange,
  disabled = false,
}: {
  time: ClockTime;
  onChange: (time: ClockTime) => void;
  /** After answering: shown but locked (kept mounted so the page does not collapse). */
  disabled?: boolean;
}) {
  const t = useTranslations("Numbers");
  const hourId = useId();
  const minuteId = useId();
  return (
    // pan-y: a vertical swipe that starts on a slider scrolls the page; only a horizontal drag moves the thumb.
    <div className="w-full touch-pan-y space-y-3">
      <div>
        <label htmlFor={hourId} className="mb-1 flex items-center justify-between text-sm font-bold text-text-muted">
          <span>{t("clock.hour")}</span>
          <span className="tabular-nums text-text">{time.hour}</span>
        </label>
        <input
          id={hourId}
          type="range"
          min={0}
          max={23}
          step={1}
          value={time.hour}
          onChange={(e) => onChange({ ...time, hour: Number(e.target.value) })}
          disabled={disabled}
          className="h-11 w-full touch-pan-y accent-primary disabled:opacity-60"
        />
      </div>
      <div>
        <label htmlFor={minuteId} className="mb-1 flex items-center justify-between text-sm font-bold text-text-muted">
          <span>{t("clock.minute")}</span>
          <span className="tabular-nums text-text">{time.minute}</span>
        </label>
        <input
          id={minuteId}
          type="range"
          min={0}
          max={59}
          step={1}
          value={time.minute}
          onChange={(e) => onChange({ ...time, minute: Number(e.target.value) })}
          disabled={disabled}
          className="h-11 w-full touch-pan-y accent-primary disabled:opacity-60"
        />
      </div>
    </div>
  );
}

/** Interactive clock that shows the time in official, everyday and digital form. */
export default function ClockExplorer() {
  const t = useTranslations("Numbers");
  const [time, setTime] = useState<ClockTime>({ hour: 14, minute: 30 });
  const [touched, setTouched] = useState(false);
  const everyday = colloquialVariants(time);
  const change = (next: ClockTime) => {
    setTouched(true);
    setTime(next);
  };
  // Announced once the hands stop moving, never every step of a drag or held arrow key.
  const announcement = useSettledValue(touched ? `${formatClock(time)}, ${officialTime(time)}` : "");

  const rows: [string, ReactNode][] = [
    [t("clock.digital"), <span key="d" className="tabular-nums">{formatClock(time)}</span>],
    [
      t("clock.official"),
      <bdi key="o" dir="ltr" lang="de">
        {officialTime(time)}
      </bdi>,
    ],
    [
      t("clock.everyday"),
      everyday ? (
        <bdi key="e" dir="ltr" lang="de">
          {everyday.join(" · ")}
        </bdi>
      ) : (
        <span key="e" className="text-sm font-semibold text-text-muted">
          {t("clock.noEveryday")}
        </span>
      ),
    ],
  ];

  return (
    <section aria-labelledby="clock-title" className="space-y-4">
      <h2 id="clock-title" className="text-2xl font-extrabold">
        {t("clock.title")}
      </h2>
      {/* Sticky readout: stays in view while the sliders or the hands move. Not a live region (see below). */}
      <dl data-readout className="sticky top-[calc(var(--header-h)+0.5rem)] z-10 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-1 rounded-2xl border border-border bg-surface-2 px-4 py-3 shadow-soft">
        {rows.map(([title, value]) => (
          <div key={title} className="contents">
            <dt className="eyebrow">{title}</dt>
            <dd className="font-extrabold">{value}</dd>
          </div>
        ))}
      </dl>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div className="card grid items-start gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <div className="mx-auto flex w-full max-w-[16rem] flex-col items-center gap-4">
          <AnalogClock time={time} onChange={change} label={t("clock.label", { time: formatClock(time) })} size={256} />
          <p className="text-center text-sm text-text-muted">{t("clock.hint")}</p>
        </div>
        <div className="space-y-4 self-center">
          <ClockSliders time={time} onChange={change} />
        </div>
      </div>
      <p className="feedback-hint">{t("clock.tip")}</p>
    </section>
  );
}
