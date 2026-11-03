import { COLORS } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import type { ReadingKind } from "@/types/reading";

function Art({ kind }: { kind: ReadingKind }) {
  switch (kind) {
    case "postcard":
      return (
        <>
          <rect x={5} y={14} width={54} height={36} rx={6} fill={COLORS.white} />
          <rect x={44} y={19} width={10} height={13} rx={2} fill={COLORS.red} />
          <path d="M11 24h20M11 32h20M36 42h17M11 40h16" strokeWidth={2} />
        </>
      );
    case "email":
      return (
        <>
          <rect x={5} y={14} width={54} height={36} rx={6} fill={COLORS.white} />
          <path d="M6 17l26 19 26-19" />
        </>
      );
    case "notice":
      return (
        <>
          <rect x={10} y={10} width={44} height={44} rx={6} fill={COLORS.yellowTint} />
          <circle cx={32} cy={16} r={4} fill={COLORS.red} />
          <path d="M18 28h28M18 36h28M18 44h16" strokeWidth={2} />
        </>
      );
    case "menu":
      return (
        <>
          <rect x={14} y={6} width={36} height={52} rx={6} fill={COLORS.white} />
          <path d="M21 18h14M21 28h14M21 38h14M21 48h14" strokeWidth={2} />
          <circle cx={43} cy={18} r={2} fill={COLORS.green} stroke="none" />
          <circle cx={43} cy={28} r={2} fill={COLORS.green} stroke="none" />
          <circle cx={43} cy={38} r={2} fill={COLORS.green} stroke="none" />
          <circle cx={43} cy={48} r={2} fill={COLORS.green} stroke="none" />
        </>
      );
    case "timetable":
      return (
        <>
          <rect x={7} y={12} width={50} height={40} rx={6} fill={COLORS.white} />
          <rect x={7} y={12} width={50} height={10} rx={5} fill={COLORS.blue} />
          <path d="M7 34h50M7 43h50M24 22v30M41 22v30" strokeWidth={2} />
        </>
      );
    case "ad":
      return (
        <>
          <path d="M8 32 32 8h22v22L30 54z" fill={COLORS.green} />
          <circle cx={44} cy={18} r={4} fill={COLORS.white} />
        </>
      );
    default:
      return (
        <>
          <path d="M8 12h48a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H28l-10 10v-10H8a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4z" fill={COLORS.blueTint} />
          <circle cx={20} cy={28} r={2.5} fill={COLORS.blue} stroke="none" />
          <circle cx={32} cy={28} r={2.5} fill={COLORS.blue} stroke="none" />
          <circle cx={44} cy={28} r={2.5} fill={COLORS.blue} stroke="none" />
        </>
      );
  }
}

/** Small illustration for the kind of a reading text. */
export default function ReadingKindIcon({
  kind,
  size = 64,
  className,
  title,
}: IllustrationProps & { kind: ReadingKind }) {
  return (
    <Svg viewBox="0 0 64 64" size={size} className={className} title={title}>
      <Art kind={kind} />
    </Svg>
  );
}
