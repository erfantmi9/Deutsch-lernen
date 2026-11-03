import type { ReactElement, ReactNode } from "react";
import { COLORS, INK } from "../palette";

export type IconFC = () => ReactElement;

const SKIN = COLORS.redTint;
const SHORT = "M15 15c0-6 4-9 9-9s9 3 9 9c-3-3-15-3-18 0z";

export type Hair = "short" | "long" | "bun" | "pigtails" | "spiky" | "none";

/** Shared person drawing (48x48 space) reused by family and school icons. */
export function Person({
  hair = "short",
  hairColor = INK,
  shirt = COLORS.blue,
  scale = 1,
  glasses = false,
  children,
}: {
  hair?: Hair;
  hairColor?: string;
  shirt?: string;
  scale?: number;
  glasses?: boolean;
  children?: ReactNode;
}) {
  return (
    <g transform={`translate(24 46) scale(${scale}) translate(-24 -46)`}>
      {hair === "long" && <path d="M15 15a9 9 0 0 1 18 0v13H15z" fill={hairColor} />}
      {hair === "pigtails" && (
        <>
          <circle cx={12} cy={21} r={3.6} fill={hairColor} />
          <circle cx={36} cy={21} r={3.6} fill={hairColor} />
        </>
      )}
      <path d="M9 46c0-10 6-16 15-16s15 6 15 16z" fill={shirt} />
      <circle cx={24} cy={16} r={9} fill={SKIN} />
      {hair === "spiky" ? (
        <path d="M15 15l2-9 4 4 3-6 3 6 4-4 2 9c-3-3-15-3-18 0z" fill={hairColor} />
      ) : hair === "none" ? (
        <path d="M24 7c-2-3 1-4 3-3" />
      ) : (
        <path d={SHORT} fill={hairColor} />
      )}
      {hair === "bun" && <circle cx={24} cy={5} r={3.5} fill={hairColor} />}
      <circle cx={20.5} cy={18} r={1.3} fill={INK} stroke="none" />
      <circle cx={27.5} cy={18} r={1.3} fill={INK} stroke="none" />
      <path d="M21 22q3 2.5 6 0" strokeWidth={2} />
      {glasses && (
        <g strokeWidth={1.8}>
          <circle cx={20.5} cy={18} r={3.3} />
          <circle cx={27.5} cy={18} r={3.3} />
          <path d="M23.8 18h.4" />
        </g>
      )}
      {children}
    </g>
  );
}

/** Clock face; `wedge` shades the first hour sector (12 to 3). */
export function Clock({
  cx = 24,
  cy = 24,
  r = 17,
  hour = 3,
  minute = 0,
  wedge = false,
}: {
  cx?: number;
  cy?: number;
  r?: number;
  hour?: number;
  minute?: number;
  wedge?: boolean;
}) {
  const pt = (deg: number, len: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(cx + len * Math.cos(a)).toFixed(1)} ${(cy + len * Math.sin(a)).toFixed(1)}`;
  };
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={COLORS.white} />
      {wedge && <path d={`M${cx} ${cy}V${cy - r + 3}a${r - 3} ${r - 3} 0 0 1 ${r - 3} ${r - 3}z`} fill={COLORS.yellow} stroke="none" />}
      <path d={`M${cx} ${cy - r + 2}v3M${cx} ${cy + r - 2}v-3M${cx - r + 2} ${cy}h3M${cx + r - 2} ${cy}h-3`} />
      <path d={`M${cx} ${cy}L${pt(hour * 30 + minute / 2, r * 0.5)}`} strokeWidth={3} />
      <path d={`M${cx} ${cy}L${pt(minute * 6, r * 0.75)}`} />
    </g>
  );
}

/** Calendar page; `mark` highlights one cell (col 0-2, row 0-1) or a whole row. */
export function Calendar({
  col,
  row,
  markRow,
  color,
}: {
  col?: number;
  row?: number;
  markRow?: number;
  color: string;
}) {
  const cells = [0, 1].flatMap((r) => [0, 1, 2].map((c) => ({ c, r })));
  return (
    <g>
      <rect x={7} y={9} width={34} height={33} rx={5} fill={COLORS.white} />
      <path d="M7 18v-4a5 5 0 0 1 5-5h24a5 5 0 0 1 5 5v4z" fill={COLORS.red} />
      <path d="M16 6v6M32 6v6" />
      {cells.map(({ c, r }) => {
        const on = (c === col && r === row) || r === markRow;
        return <rect key={`${c}${r}`} x={11 + c * 10} y={22 + r * 10} width={7} height={7} rx={2} fill={on ? color : COLORS.blueTint} strokeWidth={on ? 2.5 : 1.5} />;
      })}
    </g>
  );
}
