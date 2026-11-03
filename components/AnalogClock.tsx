"use client";

import { useRef } from "react";
import type { PointerEvent } from "react";
import { clockAngles } from "@/lib/numbers";
import type { ClockTime } from "@/types/numbers";
import { COLORS, INK } from "./illustrations/palette";
import { Svg } from "./illustrations/Svg";

const CENTER = 60;

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(a), y: CENTER + radius * Math.sin(a) };
}

const NUMERALS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * Analog clock in the illustration style: hour hand blue, minute hand red.
 * Read-only by default. With `onChange` the minute hand follows the pointer on the face
 * (the hour advances when the hand crosses 12). Keyboard users use the sliders next to the clock.
 */
export default function AnalogClock({
  time,
  onChange,
  label,
  size = 220,
  className,
}: {
  time: ClockTime;
  onChange?: (time: ClockTime) => void;
  /** Accessible description of the time shown (used when the clock is read-only). */
  label: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const interactive = onChange !== undefined;

  const angles = clockAngles(time);
  const hourHand = polar(angles.hour, 26);
  const minuteHand = polar(angles.minute, 41);

  const update = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || !onChange) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    const minute = Math.round(deg / 6) % 60;

    let hour = time.hour;
    if (time.minute >= 45 && minute <= 15) hour = (hour + 1) % 24;
    else if (time.minute <= 15 && minute >= 45) hour = (hour + 23) % 24;
    onChange({ hour, minute });
  };

  return (
    <div
      ref={ref}
      className={(interactive ? "cursor-pointer touch-none select-none " : "") + (className ?? "")}
      style={{ width: size, maxWidth: "100%" }}
      onPointerDown={
        interactive
          ? (e) => {
              dragging.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              update(e);
            }
          : undefined
      }
      onPointerMove={interactive ? (e) => dragging.current && update(e) : undefined}
      onPointerUp={interactive ? () => (dragging.current = false) : undefined}
      onPointerCancel={interactive ? () => (dragging.current = false) : undefined}
    >
      <Svg viewBox="0 0 120 120" size="100%" title={interactive ? undefined : label}>
        <circle cx={CENTER} cy={CENTER} r={56} fill={COLORS.white} strokeWidth={3} />
        {Array.from({ length: 60 }, (_, i) => {
          const major = i % 5 === 0;
          const a = polar(i * 6, major ? 47 : 50);
          const b = polar(i * 6, 52);
          return <path key={i} d={`M${a.x} ${a.y}L${b.x} ${b.y}`} strokeWidth={major ? 2 : 1} stroke={major ? INK : COLORS.blueTint} />;
        })}
        {NUMERALS.map((n) => {
          const p = polar(n * 30, 38);
          return (
            <text
              key={n}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10}
              fontWeight={800}
              fill={INK}
              stroke="none"
            >
              {n}
            </text>
          );
        })}
        <path d={`M${CENTER} ${CENTER}L${hourHand.x} ${hourHand.y}`} stroke={COLORS.blue} strokeWidth={5} />
        <path d={`M${CENTER} ${CENTER}L${minuteHand.x} ${minuteHand.y}`} stroke={COLORS.red} strokeWidth={3.5} />
        <circle cx={CENTER} cy={CENTER} r={4.5} fill={COLORS.yellow} strokeWidth={2} />
      </Svg>
    </div>
  );
}
