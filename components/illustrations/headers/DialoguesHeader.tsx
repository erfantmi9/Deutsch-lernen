import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";

/** Two speech bubbles next to a waving mascot. Mirrors in RTL locales (no text in the scene). */
export default function DialoguesHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 120" size={size} className={"rtl:-scale-x-100 " + (className ?? "")} title={title}>
      <g transform="translate(4 6) scale(.9)">
        <MascotArt mood="speaking" />
      </g>
      <path d="M124 22h64a10 10 0 0 1 10 10v22a10 10 0 0 1-10 10h-40l-14 12V64h-10a10 10 0 0 1-10-10V32a10 10 0 0 1 10-10z" fill={COLORS.blueTint} />
      <path d="M138 36h44M138 50h28" strokeWidth={3} />
      <path d="M212 62h-10a10 10 0 0 0-10 10v18a10 10 0 0 0 10 10h24l12 10V100h4a10 10 0 0 0 10-10V72a10 10 0 0 0-10-10z" transform="translate(-34 -8)" fill={COLORS.yellowTint} />
      <circle cx={190} cy={86} r={3} fill={COLORS.red} stroke="none" />
      <circle cx={202} cy={86} r={3} fill={COLORS.green} stroke="none" />
      <circle cx={214} cy={86} r={3} fill={COLORS.blue} stroke="none" />
    </Svg>
  );
}
