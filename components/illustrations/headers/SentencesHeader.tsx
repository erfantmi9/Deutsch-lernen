import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";

/** Sentence blocks read in order, so the whole scene mirrors in RTL locales. */
const BLOCKS = [
  { x: 124, y: 22, w: 44, fill: COLORS.yellow },
  { x: 174, y: 22, w: 54, fill: COLORS.blueTint },
  { x: 124, y: 52, w: 58, fill: COLORS.greenTint },
  { x: 188, y: 52, w: 40, fill: COLORS.redTint },
  { x: 124, y: 82, w: 34, fill: COLORS.blue },
  { x: 164, y: 82, w: 50, fill: COLORS.white },
] as const;

export default function SentencesHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg
      viewBox="0 0 240 120"
      size={size}
      className={"rtl:-scale-x-100 " + (className ?? "")}
      title={title}
    >
      <g transform="translate(4 6) scale(.9)">
        <MascotArt mood="waving" />
      </g>
      {BLOCKS.map(({ x, y, w, fill }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={22} rx={11} fill={fill} />
      ))}
    </Svg>
  );
}
