import { COLORS } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import type { DialogueTopic } from "@/types/dialogue";

const person = (cx: number, cy: number, r: number, fill: string) => (
  <g key={`${cx}-${cy}`}>
    <circle cx={cx} cy={cy} r={r} fill={fill} />
    <path d={`M${cx - r - 4} ${cy + r * 2 + 8}a${r + 4} ${r + 4} 0 0 1 ${(r + 4) * 2} 0z`} fill={COLORS.white} />
  </g>
);

function Art({ topic }: { topic: DialogueTopic }) {
  switch (topic) {
    case "introduce":
      return <>{[person(20, 22, 7, COLORS.blue), person(44, 22, 7, COLORS.yellow)]}</>;
    case "order-food":
      return (
        <>
          <path d="M12 28h30v10a15 15 0 0 1-30 0z" fill={COLORS.yellowTint} />
          <path d="M42 31h4a6 6 0 0 1 0 12h-5" />
          <path d="M20 12c-2 3 2 5 0 8M28 12c-2 3 2 5 0 8M36 12c-2 3 2 5 0 8" strokeWidth={2} />
        </>
      );
    case "shopping":
      return (
        <>
          <path d="M23 24v-4a9 9 0 0 1 18 0v4" />
          <rect x={12} y={24} width={40} height={30} rx={7} fill={COLORS.red} />
        </>
      );
    case "directions":
      return (
        <>
          <path d="M30 8v50" />
          <path d="M30 14h20l7 7-7 7H30z" fill={COLORS.blue} />
          <path d="M30 34H14l-7 7 7 7h16z" fill={COLORS.green} />
        </>
      );
    case "appointment":
      return (
        <>
          <rect x={9} y={14} width={46} height={40} rx={8} fill={COLORS.white} />
          <path d="M9 22a8 8 0 0 1 8-8h30a8 8 0 0 1 8 8v6H9z" fill={COLORS.red} />
          <path d="M20 8v10M44 8v10M22 42l7 7 13-14" />
        </>
      );
    case "form":
      return (
        <>
          <rect x={13} y={10} width={38} height={46} rx={7} fill={COLORS.white} />
          <rect x={24} y={5} width={16} height={11} rx={4} fill={COLORS.yellow} />
          <path d="M21 28h22M21 37h22M21 46h13" />
        </>
      );
    case "phone":
      return (
        <>
          <rect x={18} y={6} width={28} height={52} rx={8} fill={COLORS.blueTint} />
          <rect x={23} y={14} width={18} height={26} rx={3} fill={COLORS.white} />
          <circle cx={32} cy={49} r={3} fill={COLORS.blue} stroke="none" />
        </>
      );
    case "family":
      return <>{[person(18, 20, 6, COLORS.blue), person(46, 20, 6, COLORS.red), person(32, 32, 5, COLORS.yellow)]}</>;
    case "daily-routine":
      return (
        <>
          <circle cx={32} cy={32} r={11} fill={COLORS.yellow} />
          <path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6" />
        </>
      );
    default:
      return (
        <>
          <circle cx={22} cy={22} r={10} fill={COLORS.yellow} />
          <path d="M16 50a10 10 0 0 1 2-19 13 13 0 0 1 25 3 9 9 0 0 1 1 16z" fill={COLORS.white} />
        </>
      );
  }
}

/** Small illustration for a dialogue topic. */
export default function DialogueTopicIcon({
  topic,
  size = 64,
  className,
  title,
}: IllustrationProps & { topic: DialogueTopic }) {
  return (
    <Svg viewBox="0 0 64 64" size={size} className={className} title={title}>
      <Art topic={topic} />
    </Svg>
  );
}
