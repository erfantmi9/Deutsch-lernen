import type { ReactNode } from "react";
import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { toneColor } from "../palette";
import type { Tone } from "../palette";

export type BadgeProps = IllustrationProps & {
  /** Not yet earned: rendered faded and grey. */
  locked?: boolean;
};

/** Medal with ribbon tails; badge glyphs are drawn around the centre (32, 28). */
export default function BadgeBase({
  tone,
  locked,
  size = 64,
  className,
  title,
  children,
}: BadgeProps & { tone: Tone; children: ReactNode }) {
  return (
    <Svg
      viewBox="0 0 64 68"
      size={size}
      title={title}
      className={(locked ? "grayscale opacity-50 " : "") + (className ?? "")}
    >
      <path d="M20 46l-4 18 9-5 5 7 3-17z" fill={COLORS.blue} />
      <path d="M44 46l4 18-9-5-5 7-3-17z" fill={COLORS.blue} />
      <circle cx={32} cy={28} r={23} fill={toneColor(tone)} />
      {children}
    </Svg>
  );
}
