import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";

const DOTS = [
  [132, 58], [146, 58], [160, 58],
  [132, 70], [146, 70], [160, 70],
  [132, 82], [146, 82],
] as const;

/** A tear-off calendar and a clock next to a waving mascot. The scene mirrors in RTL locales (it has no digits or text). */
export default function NumbersHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 120" size={size} className={"rtl:-scale-x-100 " + (className ?? "")} title={title}>
      <g transform="translate(4 6) scale(.9)">
        <MascotArt mood="waving" />
      </g>
      <rect x={118} y={30} width={62} height={64} rx={10} fill={COLORS.white} />
      <path d="M118 40a10 10 0 0 1 10-10h42a10 10 0 0 1 10 10v8h-62z" fill={COLORS.red} />
      <path d="M134 24v12M164 24v12" strokeWidth={4} />
      {DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill={COLORS.blueTint} stroke="none" />
      ))}
      <circle cx={160} cy={82} r={5} fill={COLORS.yellow} />
      <circle cx={202} cy={76} r={26} fill={COLORS.yellowTint} />
      <circle cx={202} cy={76} r={2.5} fill={COLORS.blue} stroke="none" />
      <path d="M202 76V58M202 76l12 7" strokeWidth={3.5} />
    </Svg>
  );
}
