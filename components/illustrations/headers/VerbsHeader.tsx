import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";

/** A little conjugation table with a lightning bolt, next to a thinking mascot. */
export default function VerbsHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 120" size={size} className={className} title={title}>
      <g transform="translate(4 6) scale(.9)">
        <MascotArt mood="thinking" />
      </g>
      <rect x={128} y={34} width={96} height={72} rx={10} fill={COLORS.white} />
      <path d="M128 58h96M128 82h96M160 34v72" />
      <circle cx={144} cy={46} r={4.5} fill={COLORS.blue} stroke="none" />
      <circle cx={144} cy={70} r={4.5} fill={COLORS.red} stroke="none" />
      <circle cx={144} cy={94} r={4.5} fill={COLORS.green} stroke="none" />
      <path d="M176 66h36M176 90h24M176 42h30" strokeWidth={3} />
      <path d="M214 4 198 26h10l-3 16 18-24h-10z" fill={COLORS.yellow} />
    </Svg>
  );
}
