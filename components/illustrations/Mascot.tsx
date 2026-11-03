import { COLORS, INK } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import { SPARKLE_D } from "./shapes";

export type Mood = "happy" | "thinking" | "cheering" | "sad" | "waving";

const WING_DOWN_L = "M22 60c-10 4-12 16-4 22 8-2 12-10 10-20z";
const WING_DOWN_R = "M98 60c10 4 12 16 4 22-8-2-12-10-10-20z";
const WING_UP_L = "M24 60C14 54 8 44 10 34c8 0 18 6 22 18z";
const WING_UP_R = "M96 60C106 54 112 44 110 34c-8 0-18 6-22 18z";
const WING_CHEEK = "M92 76c-6 8-16 10-22 6 1-7 10-12 18-10z";

function Eye({ cx, cy, px = 0, py = 0 }: { cx: number; cy: number; px?: number; py?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={6.5} fill={COLORS.white} strokeWidth={2} />
      <circle cx={cx + px} cy={cy + py} r={3.4} fill={INK} stroke="none" />
      <circle cx={cx + px + 1.2} cy={cy + py - 1.2} r={1.1} fill={COLORS.white} stroke="none" />
    </g>
  );
}

/** The mascot drawing in a 120x120 coordinate space, for embedding in larger scenes. */
export function MascotArt({ mood }: { mood: Mood }) {
  const happyEyes = mood === "cheering";
  const wingL = mood === "cheering" ? WING_UP_L : WING_DOWN_L;
  const wingR =
    mood === "cheering" || mood === "waving"
      ? WING_UP_R
      : mood === "thinking"
        ? WING_CHEEK
        : WING_DOWN_R;
  const look = mood === "thinking" ? { px: 2, py: -2 } : mood === "sad" ? { px: 0, py: 2 } : {};

  return (
    <g>
      <path d="M52 104v7m-5 0h10M68 104v7m-5 0h10" stroke={INK} />
      <path d="M54 26c-2-7 1-11 4-12 0 4 2 5 2 8M64 26c1-5 5-7 8-6-2 3-3 5-4 7" />
      <circle cx={60} cy={64} r={40} fill={COLORS.yellow} />
      <ellipse cx={60} cy={80} rx={24} ry={19} fill={COLORS.yellowTint} stroke="none" />
      <circle cx={34} cy={72} r={5} fill={COLORS.red} opacity={0.3} stroke="none" />
      <circle cx={86} cy={72} r={5} fill={COLORS.red} opacity={0.3} stroke="none" />
      <path d={wingL} fill={COLORS.yellow} />
      <path d={wingR} fill={COLORS.yellow} />

      {happyEyes ? (
        <path d="M39 58q7-9 14 0M67 58q7-9 14 0" strokeWidth={3} />
      ) : (
        <>
          <Eye cx={46} cy={57} {...look} />
          <Eye cx={74} cy={57} {...look} />
        </>
      )}
      {mood === "sad" && (
        <>
          <path d="M37 49l15-6M83 49l-15-6" />
          <path d="M40 67c-3 4-3 7 0 7s3-3 0-7z" fill={COLORS.blueTint} strokeWidth={1.8} />
        </>
      )}
      {mood === "thinking" && <path d="M66 45q7-5 14 0" />}

      {mood === "cheering" ? (
        <>
          <path d="M51 66h18l-9 6z" fill={COLORS.red} />
          <path d="M53 74h14l-7 8z" fill={COLORS.red} />
        </>
      ) : (
        <path d="M53 66h14l-7 9z" fill={COLORS.red} />
      )}

      {mood === "cheering" && (
        <>
          <path d={SPARKLE_D} transform="translate(2 4) scale(.3)" fill={COLORS.blue} stroke="none" />
          <path d={SPARKLE_D} transform="translate(98 2) scale(.26)" fill={COLORS.green} stroke="none" />
          <circle cx={50} cy={6} r={2.5} fill={COLORS.red} stroke="none" />
          <circle cx={72} cy={4} r={2.5} fill={COLORS.blue} stroke="none" />
        </>
      )}
      {mood === "thinking" && (
        <>
          <circle cx={96} cy={30} r={3} fill={COLORS.blueTint} strokeWidth={2} />
          <circle cx={104} cy={19} r={4.5} fill={COLORS.blueTint} strokeWidth={2} />
        </>
      )}
    </g>
  );
}

export type MascotProps = IllustrationProps & { mood?: Mood };

export default function Mascot({ mood = "happy", size = 120, className, title }: MascotProps) {
  return (
    <Svg viewBox="0 0 120 120" size={size} className={className} title={title}>
      <MascotArt mood={mood} />
    </Svg>
  );
}
