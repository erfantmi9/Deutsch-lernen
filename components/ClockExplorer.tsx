"use client";

import { useId, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { colloquialVariants, formatClock, officialTime } from "@/lib/numbers";
import type { ClockTime } from "@/types/numbers";
import AnalogClock from "./AnalogClock";
import { useSettledValue } from "./ui/useSettledValue";

/** Movement (px) before a touch counts as a horizontal drag of the slider rather than a tap / start of a scroll. */
const DRAG_SLOP = 6;

/**
 * A native range input (keyboard, screen readers and labels work as usual) whose pointer input is handled by its
 * wrapper. Chromium moves a range thumb to the touch point on touchstart, so a vertical swipe that happens to start
 * on a slider changed the value AND fought the page scroll. Here the wrapper is `touch-action: pan-y`: a vertical
 * swipe belongs to the browser (we get pointercancel), only a horizontal drag sets the value. Mouse/pen work at once.
 */
function Slider({
  id,
  max,
  value,
  onValue,
  disabled,
}: {
  id: string;
  max: number;
  value: number;
  onValue: (v: number) => void;
  disabled: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; active: boolean } | null>(null);

  const valueAt = (clientX: number) => {
    const el = input.current!;
    const r = el.getBoundingClientRect();
    let f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    if (getComputedStyle(el).direction === "rtl") f = 1 - f;
    return Math.round(f * max);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    input.current?.focus({ preventScroll: true });
    const active = e.pointerType !== "touch";
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, active };
    if (active) {
      e.currentTarget.setPointerCapture(e.pointerId);
      onValue(valueAt(e.clientX));
    }
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      const dx = Math.abs(e.clientX - d.x);
      if (dx < DRAG_SLOP || dx < Math.abs(e.clientY - d.y)) return;
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    onValue(valueAt(e.clientX));
  };
  const end = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // A touch tap (no drag, no scroll) sets the value where it landed, like the native slider.
    if (!d.active && e.type === "pointerup") onValue(valueAt(e.clientX));
    drag.current = null;
  };

  return (
    <div
      className={"touch-pan-y " + (disabled ? "" : "cursor-pointer")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <input
        ref={input}
        id={id}
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onValue(Number(e.target.value))}
        disabled={disabled}
        className="pointer-events-none h-11 w-full accent-primary disabled:opacity-60"
      />
    </div>
  );
}

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
    <div className="w-full space-y-3">
      <div>
        <label htmlFor={hourId} className="mb-1 flex items-center justify-between text-sm font-bold text-text-muted">
          <span>{t("clock.hour")}</span>
          <span className="tabular-nums text-text">{time.hour}</span>
        </label>
        <Slider id={hourId} max={23} value={time.hour} onValue={(hour) => onChange({ ...time, hour })} disabled={disabled} />
      </div>
      <div>
        <label htmlFor={minuteId} className="mb-1 flex items-center justify-between text-sm font-bold text-text-muted">
          <span>{t("clock.minute")}</span>
          <span className="tabular-nums text-text">{time.minute}</span>
        </label>
        <Slider id={minuteId} max={59} value={time.minute} onValue={(minute) => onChange({ ...time, minute })} disabled={disabled} />
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
