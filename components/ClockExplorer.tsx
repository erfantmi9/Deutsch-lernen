"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { colloquialVariants, formatClock, officialTime } from "@/lib/numbers";
import type { ClockTime } from "@/types/numbers";
import AnalogClock from "./AnalogClock";

/** Hour and minute sliders: the accessible way to set a clock (the pointer on the face is a bonus). */
export function ClockSliders({ time, onChange }: { time: ClockTime; onChange: (time: ClockTime) => void }) {
  const t = useTranslations("Numbers");
  const hourId = useId();
  const minuteId = useId();
  return (
    <div className="w-full space-y-3">
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
          className="h-11 w-full accent-primary"
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
          className="h-11 w-full accent-primary"
        />
      </div>
    </div>
  );
}

function Readout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="eyebrow">{title}</p>
      <p className="mt-1 text-xl font-extrabold">{children}</p>
    </div>
  );
}

/** Interactive clock that shows the time in official, everyday and digital form. */
export default function ClockExplorer() {
  const t = useTranslations("Numbers");
  const [time, setTime] = useState<ClockTime>({ hour: 14, minute: 30 });
  const everyday = colloquialVariants(time);

  return (
    <section aria-labelledby="clock-title" className="space-y-5">
      <h2 id="clock-title" className="text-2xl font-extrabold">
        {t("clock.title")}
      </h2>
      <div className="card grid items-start gap-6 p-5 sm:grid-cols-2 sm:p-6">
        <div className="mx-auto flex w-full max-w-[16rem] flex-col items-center gap-4">
          <AnalogClock time={time} onChange={setTime} label={t("clock.label", { time: formatClock(time) })} size={256} />
          <p className="text-center text-sm text-text-muted">{t("clock.hint")}</p>
        </div>
        <div className="space-y-4">
          <ClockSliders time={time} onChange={setTime} />
          <div aria-live="polite" className="space-y-3">
            <Readout title={t("clock.digital")}>
              <span className="tabular-nums">{formatClock(time)}</span>
            </Readout>
            <Readout title={t("clock.official")}>
              <bdi dir="ltr" lang="de">
                {officialTime(time)}
              </bdi>
            </Readout>
            <Readout title={t("clock.everyday")}>
              {everyday ? (
                <bdi dir="ltr" lang="de">
                  {everyday.join(" · ")}
                </bdi>
              ) : (
                <span className="text-sm font-semibold text-text-muted">{t("clock.noEveryday")}</span>
              )}
            </Readout>
          </div>
        </div>
      </div>
      <p className="feedback-hint">{t("clock.tip")}</p>
    </section>
  );
}
