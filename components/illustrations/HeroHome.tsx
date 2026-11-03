import { COLORS, INK } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import { MascotArt } from "./Mascot";
import { BLOB_D, CLOUD_D, SPARKLE_D, STAR_D } from "./shapes";

/** Floating umlaut tiles are HTML (not SVG text) so they stay crisp and themeable. */
const LETTERS = [
  { ch: "ä", pos: "start-[4%] top-[14%]", delay: "0s" },
  { ch: "ö", pos: "end-[6%] top-[8%]", delay: "-1.2s" },
  { ch: "ü", pos: "start-[10%] top-[56%]", delay: "-2.4s" },
  { ch: "ß", pos: "end-[4%] top-[50%]", delay: "-3.4s" },
] as const;

export default function HeroHome({ className, title }: IllustrationProps) {
  return (
    <div className={"relative mx-auto w-full max-w-sm " + (className ?? "")}>
      <Svg viewBox="0 0 360 280" width="100%" title={title}>
        <path d={BLOB_D} transform="translate(60 30) scale(1.2)" fill={COLORS.blueTint} stroke="none" />
        <g transform="translate(10 36) scale(1.1)">
          <path d={CLOUD_D} fill={COLORS.white} />
        </g>
        <g transform="translate(270 22) scale(.8)">
          <path d={CLOUD_D} fill={COLORS.white} />
        </g>
        <path d={STAR_D} transform="translate(300 150) scale(.5)" fill={COLORS.yellow} />
        <path d={SPARKLE_D} transform="translate(36 150) scale(.45)" fill={COLORS.green} stroke="none" />
        <path d={SPARKLE_D} transform="translate(308 90) scale(.35)" fill={COLORS.red} stroke="none" />
        <ellipse cx={180} cy={262} rx={110} ry={9} fill={INK} opacity={0.1} stroke="none" />
        <g transform="translate(90 78) scale(1.6)">
          <MascotArt mood="waving" />
        </g>
        <rect x={14} y={236} width={104} height={24} rx={6} fill={COLORS.blue} />
        <path d="M28 236v24M36 236v24" />
        <rect x={24} y={212} width={88} height={24} rx={6} fill={COLORS.red} />
        <path d="M38 212v24M46 212v24" />
        <rect x={18} y={188} width={96} height={24} rx={6} fill={COLORS.green} />
        <path d="M32 188v24M40 188v24" />
      </Svg>
      {LETTERS.map(({ ch, pos, delay }) => (
        <span
          key={ch}
          aria-hidden="true"
          style={{ animationDelay: delay }}
          className={`absolute ${pos} flex h-11 w-11 animate-float items-center justify-center rounded-2xl bg-surface text-2xl font-extrabold text-primary shadow-soft`}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}
