"use client";

import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { COLORS, INK } from "./illustrations/palette";

const COLS = 7;
const CELL_W = 30;
const CELL_H = 26;
const X0 = 10;
const Y0 = 42;
const WIDTH = X0 * 2 + COLS * CELL_W;

/**
 * Interactive calendar page: a binder-style header and one button per day.
 * Roving tab stop: Tab reaches the selected day, arrow keys / Home / End move between days.
 * Uses a plain <svg> (not the decorative wrapper) so the day buttons stay visible to assistive technology.
 */
export default function CalendarSvg({
  days,
  day,
  onSelect,
  groupLabel,
  dayLabel,
  className,
}: {
  days: number;
  day: number;
  onSelect: (day: number) => void;
  groupLabel: string;
  dayLabel: (day: number) => string;
  className?: string;
}) {
  const refs = useRef<(SVGGElement | null)[]>([]);
  const rows = Math.ceil(days / COLS);
  const height = Y0 + rows * CELL_H + 10;

  const move = (target: number) => {
    const next = Math.min(days, Math.max(1, target));
    onSelect(next);
    requestAnimationFrame(() => refs.current[next - 1]?.focus());
  };

  const onKeyDown = (e: KeyboardEvent<SVGGElement>, d: number) => {
    const delta: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    if (e.key in delta) {
      e.preventDefault();
      move(d + delta[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(d);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(1);
    } else if (e.key === "End") {
      e.preventDefault();
      move(days);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      width="100%"
      className={className}
      fill="none"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="group"
      aria-label={groupLabel}
    >
      <rect x={2} y={4} width={WIDTH - 4} height={height - 8} rx={14} fill={COLORS.blueTint} />
      <path d={`M2 18a14 14 0 0 1 14-14h${WIDTH - 32}a14 14 0 0 1 14 14v14H2z`} fill={COLORS.red} />
      <path d="M52 0v14M158 0v14" strokeWidth={5} />
      {Array.from({ length: days }, (_, i) => {
        const d = i + 1;
        const x = X0 + (i % COLS) * CELL_W;
        const y = Y0 + Math.floor(i / COLS) * CELL_H;
        const selected = d === day;
        return (
          <g
            key={d}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="button"
            tabIndex={selected ? 0 : -1}
            aria-label={dayLabel(d)}
            aria-pressed={selected}
            onClick={() => onSelect(d)}
            onKeyDown={(e) => onKeyDown(e, d)}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-primary [&:focus-visible>rect]:stroke-[4px]"
          >
            <rect
              x={x + 1.5}
              y={y + 1.5}
              width={CELL_W - 3}
              height={CELL_H - 3}
              rx={8}
              fill={selected ? COLORS.blue : COLORS.white}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            <text
              x={x + CELL_W / 2}
              y={y + CELL_H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={800}
              fill={selected ? COLORS.white : INK}
              stroke="none"
            >
              {d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
