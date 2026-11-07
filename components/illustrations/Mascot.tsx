import { COLORS, INK } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import { SPARKLE_D } from "./shapes";

export type Mood = "happy" | "thinking" | "cheering" | "sad" | "waving";

/*
 * "Dackel", the mascot: a dachshund seen from the side, facing the reading direction's end (right in the 120x120
 * space; RTL pages mirror whole scenes, not the mascot). Moods are carried by the ear, tail, eye, mouth and one paw.
 */

const TAIL: Record<Mood, string> = {
  happy: "M24 68C14 62 10 52 13 44",
  waving: "M24 68C14 62 10 52 13 44",
  cheering: "M24 66C12 58 8 46 14 36",
  thinking: "M24 70C14 70 8 64 8 56",
  sad: "M24 74C16 80 12 88 10 94",
};

const EAR: Record<Mood, string> = {
  happy: "M84 36c-8 2-12 12-10 24 2 6 8 7 11 2 3-8 3-17-1-26z",
  waving: "M84 36c-8 2-12 12-10 24 2 6 8 7 11 2 3-8 3-17-1-26z",
  thinking: "M84 36c-8 2-12 12-10 24 2 6 8 7 11 2 3-8 3-17-1-26z",
  // Flying back while celebrating.
  cheering: "M82 38c-8-6-20-8-26-2 2 6 12 9 22 9 4 0 6-3 4-7z",
  // Hanging flat.
  sad: "M83 40c-6 4-8 16-7 28 2 5 7 5 9 0 2-9 2-19-2-28z",
};

const LEGS_BACK = "M30 86v14h8V86M42 86v14h8V86";
const LEG_FRONT_A = "M70 86v14h8V86";
const LEG_FRONT_B = "M82 86v14h8V86";
/** Front paw raised for waving. */
const PAW_UP = "M84 80c6-6 14-12 24-16l3 7c-9 4-16 9-21 15z";

/** The mascot drawing in a 120x120 coordinate space, for embedding in larger scenes. */
export function MascotArt({ mood }: { mood: Mood }) {
  // Thinking tilts the head; every other mood looks straight ahead.
  const headTilt = mood === "thinking" ? "rotate(-10 92 52)" : undefined;

  return (
    <g>
      {/* Tail behind the body. */}
      <path d={TAIL[mood]} strokeWidth={5} stroke={INK} />
      <path d={TAIL[mood]} strokeWidth={2.5} stroke={COLORS.brown} />

      {/* Legs, then the long body over their tops. */}
      <path d={LEGS_BACK} fill={COLORS.brownDark} />
      <path d={LEG_FRONT_A} fill={COLORS.brownDark} />
      {mood !== "waving" && <path d={LEG_FRONT_B} fill={COLORS.brownDark} />}
      <rect x={20} y={58} width={74} height={32} rx={16} fill={COLORS.brown} />
      <path d="M34 84c12 5 34 5 48 0" stroke={COLORS.tan} strokeWidth={4} />

      {/* Collar with a yellow tag. */}
      <path d="M84 60c3 6 4 14 2 22" stroke={COLORS.red} strokeWidth={5} />
      <circle cx={88} cy={84} r={3.6} fill={COLORS.yellow} strokeWidth={1.8} />
      {/* Raised front paw sits in front of the chest. */}
      {mood === "waving" && <path d={PAW_UP} fill={COLORS.brownDark} />}

      <g transform={headTilt}>
        <circle cx={92} cy={48} r={18} fill={COLORS.brown} />
        <ellipse cx={106} cy={56} rx={12} ry={8.5} fill={COLORS.tan} />
        <ellipse cx={116} cy={52.5} rx={3.6} ry={3} fill={INK} stroke="none" />
        <path d={EAR[mood]} fill={COLORS.brownDark} />

        {/* Eye: closed happy arc when cheering, otherwise an open eye that looks up (thinking) or down (sad). */}
        {mood === "cheering" ? (
          <path d="M93 45q4-6 8 0" strokeWidth={3} />
        ) : (
          <g>
            <circle cx={97} cy={44} r={5} fill={COLORS.white} strokeWidth={2} />
            <circle cx={98.5} cy={mood === "thinking" ? 42.5 : mood === "sad" ? 45.5 : 44} r={2.7} fill={INK} stroke="none" />
            <circle cx={99.5} cy={mood === "thinking" ? 41.5 : mood === "sad" ? 44.5 : 43} r={0.9} fill={COLORS.white} stroke="none" />
          </g>
        )}
        <circle cx={99} cy={56} r={3.4} fill={COLORS.red} opacity={0.3} stroke="none" />

        {mood === "sad" && <path d="M92 35l9 3" />}
        {mood === "thinking" && <path d="M92 36q5-4 10-1" />}

        {mood === "cheering" ? (
          <>
            <path d="M101 61q7 10 14 0z" fill={COLORS.red} />
            <path d="M105 64q3 5 6 0" fill={COLORS.redTint} stroke="none" />
          </>
        ) : mood === "sad" ? (
          <path d="M103 64q5-4 10 0" />
        ) : (
          <path d="M103 61q5 4 10 0" />
        )}
        {mood === "sad" && <path d="M94 51c-2 3-2 6 0 6s2-3 0-6z" fill={COLORS.blueTint} strokeWidth={1.6} />}
      </g>

      {mood === "cheering" && (
        <>
          <path d={SPARKLE_D} transform="translate(30 6) scale(.3)" fill={COLORS.blue} stroke="none" />
          <path d={SPARKLE_D} transform="translate(100 4) scale(.26)" fill={COLORS.green} stroke="none" />
          <circle cx={60} cy={20} r={2.5} fill={COLORS.red} stroke="none" />
          <circle cx={78} cy={10} r={2.5} fill={COLORS.yellow} stroke="none" />
        </>
      )}
      {mood === "thinking" && (
        <>
          <circle cx={72} cy={26} r={3} fill={COLORS.blueTint} strokeWidth={2} />
          <circle cx={62} cy={14} r={4.5} fill={COLORS.blueTint} strokeWidth={2} />
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
