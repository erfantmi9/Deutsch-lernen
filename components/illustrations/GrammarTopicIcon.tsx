import { COLORS } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import type { GrammarTopic } from "@/types/grammar";

const PEOPLE = [
  { cx: 14, fill: COLORS.blue },
  { cx: 32, fill: COLORS.yellow },
  { cx: 50, fill: COLORS.green },
] as const;

const BOOK_LEFT = "M6 14h20a4 4 0 0 1 4 4v32a6 6 0 0 0-6-6H6z";
const BOOK_RIGHT = "M58 14H38a4 4 0 0 0-4 4v32a6 6 0 0 1 6-6h18z";
const HEART = "M32 54C14 41 8 31 8 23a12 12 0 0 1 24-3 12 12 0 0 1 24 3c0 8-6 18-24 31z";

function Art({ topic }: { topic: GrammarTopic }) {
  switch (topic) {
    case "pronouns":
      return (
        <>
          {PEOPLE.map(({ cx, fill }) => (
            <g key={cx}>
              <circle cx={cx} cy={22} r={7} fill={fill} />
              <path d={`M${cx - 11} 50a11 11 0 0 1 22 0z`} fill={COLORS.white} />
            </g>
          ))}
        </>
      );
    case "cases":
      return (
        <>
          <circle cx={15} cy={32} r={10} fill={COLORS.blue} />
          <path d="M29 32h13M36 25l7 7-7 7" />
          <rect x={44} y={22} width={16} height={20} rx={5} fill={COLORS.yellow} />
        </>
      );
    case "possessives":
      return (
        <>
          <path d={HEART} fill={COLORS.red} />
          <path d="M18 22c0-4 3-6 6-6" stroke={COLORS.white} strokeWidth={3} />
        </>
      );
    case "negation":
      return (
        <>
          <rect x={20} y={20} width={24} height={24} rx={6} fill={COLORS.yellow} />
          <circle cx={32} cy={32} r={24} fill="none" stroke={COLORS.red} strokeWidth={5} />
          <path d="M15 49 49 15" stroke={COLORS.red} strokeWidth={5} />
        </>
      );
    case "plural":
      return (
        <>
          <circle cx={11} cy={32} r={6} fill={COLORS.blue} />
          <path d="M21 32h9M26 27l5 5-5 5" />
          <circle cx={44} cy={17} r={7} fill={COLORS.green} />
          <circle cx={53} cy={34} r={7} fill={COLORS.green} />
          <circle cx={42} cy={49} r={7} fill={COLORS.green} />
        </>
      );
    case "prepositions":
      return (
        <>
          <rect x={8} y={22} width={34} height={32} rx={8} fill={COLORS.blueTint} />
          <circle cx={25} cy={40} r={6} fill={COLORS.yellow} />
          <circle cx={52} cy={14} r={6} fill={COLORS.red} />
          <path d="M48 20 40 28" />
        </>
      );
    case "questions":
      return (
        <>
          <path d="M20 22a12 12 0 1 1 17 11c-4 2-5 5-5 9" stroke={COLORS.blue} strokeWidth={6} />
          <circle cx={32} cy={53} r={4} fill={COLORS.blue} stroke="none" />
        </>
      );
    case "imperative":
      return (
        <>
          <rect x={27} y={8} width={10} height={32} rx={5} fill={COLORS.red} />
          <circle cx={32} cy={51} r={5} fill={COLORS.red} />
        </>
      );
    case "modal":
      return (
        <>
          <circle cx={19} cy={32} r={11} fill={COLORS.yellow} />
          <circle cx={19} cy={32} r={3.5} fill={COLORS.white} />
          <path d="M30 32h26M48 32v9M55 32v7" />
        </>
      );
    case "word-order":
      return (
        <>
          <rect x={4} y={14} width={16} height={16} rx={6} fill={COLORS.blue} />
          <rect x={24} y={14} width={16} height={16} rx={6} fill={COLORS.yellow} />
          <rect x={44} y={14} width={16} height={16} rx={6} fill={COLORS.green} />
          <path d="M10 48h42M44 41l8 7-8 7" />
        </>
      );
    default:
      return (
        <>
          <path d={BOOK_LEFT} fill={COLORS.white} />
          <path d={BOOK_RIGHT} fill={COLORS.blueTint} />
          <path d="M32 18v32" />
        </>
      );
  }
}

/** Small illustration for a grammar topic. Direction-aware shapes flip in RTL locales. */
export default function GrammarTopicIcon({
  topic,
  size = 64,
  className,
  title,
}: IllustrationProps & { topic: GrammarTopic }) {
  const directional = topic === "cases" || topic === "plural" || topic === "word-order";
  return (
    <Svg viewBox="0 0 64 64" size={size} className={(directional ? "rtl:-scale-x-100 " : "") + (className ?? "")} title={title}>
      <Art topic={topic} />
    </Svg>
  );
}
