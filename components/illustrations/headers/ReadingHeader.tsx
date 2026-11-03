import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";

/** A postcard and a notice next to a thinking mascot. Mirrors in RTL locales (no text in the scene). */
export default function ReadingHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 120" size={size} className={"rtl:-scale-x-100 " + (className ?? "")} title={title}>
      <g transform="translate(4 6) scale(.9)">
        <MascotArt mood="thinking" />
      </g>
      <g transform="rotate(-6 160 60)">
        <rect x={122} y={34} width={84} height={56} rx={8} fill={COLORS.white} />
        <rect x={182} y={42} width={16} height={20} rx={3} fill={COLORS.red} />
        <path d="M132 50h36M132 62h36M132 74h24" strokeWidth={3} />
        <path d="M172 78h24" strokeWidth={3} stroke={COLORS.blue} />
      </g>
      <circle cx={213} cy={26} r={5} fill={COLORS.yellow} />
      <circle cx={128} cy={24} r={4} fill={COLORS.green} />
    </Svg>
  );
}
