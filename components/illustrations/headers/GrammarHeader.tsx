import { COLORS } from "../palette";
import { Svg } from "../Svg";
import type { IllustrationProps } from "../Svg";
import { MascotArt } from "../Mascot";
import { SPARKLE_D } from "../shapes";

/** An open grammar book with the three article colours, next to a thinking mascot. Mirrors in RTL locales. */
export default function GrammarHeader({ size = 240, className, title }: IllustrationProps) {
  return (
    <Svg viewBox="0 0 240 120" size={size} className={"rtl:-scale-x-100 " + (className ?? "")} title={title}>
      <g transform="translate(4 6) scale(.9)">
        <MascotArt mood="thinking" />
      </g>
      <path d="M172 42C160 34 140 34 124 40v58c16-6 36-6 48 2z" fill={COLORS.white} />
      <path d="M172 42c12-8 32-8 48-2v58c-16-6-36-6-48 2z" fill={COLORS.blueTint} />
      <path d="M172 42v58" />
      <path d="M134 54c10-3 22-3 30 0M134 66c10-3 22-3 30 0M134 78c10-3 22-3 30 0" strokeWidth={2} />
      <circle cx={186} cy={56} r={4.5} fill={COLORS.blue} stroke="none" />
      <circle cx={186} cy={70} r={4.5} fill={COLORS.red} stroke="none" />
      <circle cx={186} cy={84} r={4.5} fill={COLORS.green} stroke="none" />
      <path d="M196 56h16M196 70h16M196 84h16" strokeWidth={3} />
      <path d="M204 32v20l6-4 6 4V32z" fill={COLORS.yellow} />
      <path d={SPARKLE_D} transform="translate(116 8) scale(.38)" fill={COLORS.yellow} stroke="none" />
    </Svg>
  );
}
