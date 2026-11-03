import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import { toneColor } from "./palette";
import type { Tone } from "./palette";

/** Path data is exported so larger scenes can embed the shapes without nested <svg>. */
export const BLOB_D = "M162 62c14 24 12 52-4 74s-46 36-72 30S38 142 30 114s4-56 28-72 78-26 104 20z";
export const CLOUD_D = "M14 36a10 10 0 0 1 0-20 14 14 0 0 1 26-4 11 11 0 0 1 10 24z";
export const STAR_D = "M24 4l6 13 14 2-10 10 3 14-13-7-13 7 3-14L4 19l14-2z";
export const SPARKLE_D = "M24 4c1 11 9 19 20 20-11 1-19 9-20 20-1-11-9-19-20-20 11-1 19-9 20-20z";

type ShapeProps = IllustrationProps & { tone?: Tone };

/** Soft background blob (no outline). */
export function Blob({ tone = "blueTint", size = 160, className, title }: ShapeProps) {
  return (
    <Svg viewBox="0 0 200 200" size={size} className={className} title={title} style={{ color: toneColor(tone) }}>
      <path d={BLOB_D} fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Outlined cloud. */
export function Cloud({ tone = "white", size = 96, className, title }: ShapeProps) {
  return (
    <Svg viewBox="0 0 64 44" size={size} className={className} title={title} style={{ color: toneColor(tone) }}>
      <path d={CLOUD_D} fill="currentColor" />
    </Svg>
  );
}

/** Outlined five-point star. */
export function Star({ tone = "yellow", size = 40, className, title }: ShapeProps) {
  return (
    <Svg viewBox="0 0 48 48" size={size} className={className} title={title} style={{ color: toneColor(tone) }}>
      <path d={STAR_D} fill="currentColor" />
    </Svg>
  );
}

/** Four-point sparkle (no outline). */
export function Sparkle({ tone = "yellow", size = 32, className, title }: ShapeProps) {
  return (
    <Svg viewBox="0 0 48 48" size={size} className={className} title={title} style={{ color: toneColor(tone) }}>
      <path d={SPARKLE_D} fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Full-width wave for section edges. Use `tone="surface-2"` to blend into a themed section. */
export function WaveDivider({ tone = "surface-2", className, title, flip = false }: ShapeProps & { flip?: boolean }) {
  return (
    <Svg
      viewBox="0 0 1200 60"
      width="100%"
      height={40}
      preserveAspectRatio="none"
      className={(flip ? "-scale-y-100 " : "") + (className ?? "")}
      title={title}
      style={{ color: toneColor(tone) }}
    >
      <path d="M0 30c150 40 300 40 450 10s300-40 450-10 225 25 300 10v20H0z" fill="currentColor" stroke="none" />
    </Svg>
  );
}
