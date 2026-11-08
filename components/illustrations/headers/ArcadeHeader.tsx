import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";
import { SPARKLE_D } from "../shapes";

/** Three fanned cards (blue / red / green, matching der / die / das) beside a cheering mascot. */
const CARDS = [
  { angle: -18, fill: COLORS.blue },
  { angle: 0, fill: COLORS.red },
  { angle: 18, fill: COLORS.green },
] as const;

export default function ArcadeHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 120" size={size} className={className} title={title}>
      {CARDS.map(({ angle, fill }) => (
        <g key={angle} transform={`translate(176 112) rotate(${angle})`}>
          <rect x={-22} y={-76} width={44} height={66} rx={9} fill={fill} />
          <circle cx={0} cy={-43} r={8} fill={COLORS.white} />
        </g>
      ))}
      <path d={SPARKLE_D} transform="translate(206 4) scale(.4)" fill={COLORS.yellow} stroke="none" />
      <g transform="translate(6 6) scale(.9)">
        <MascotArt mood="playing" />
      </g>
    </Svg>
  );
}
