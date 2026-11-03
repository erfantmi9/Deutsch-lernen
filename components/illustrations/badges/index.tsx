import BadgeBase from "./BadgeBase";
import type { BadgeProps } from "./BadgeBase";
import { COLORS } from "../palette";

export type { BadgeProps };

const FLAME = "M32 14c2 6 10 9 10 18a10 10 0 0 1-20 0c0-5 3-7 4-11 2 2 3 3 4 5 1-4 0-8 2-12z";
const FLAME_CORE = "M32 41a4.5 4.5 0 0 1-4.5-4.5c0-3 3-4 4.5-7 1.5 3 4.5 4 4.5 7A4.5 4.5 0 0 1 32 41z";

function Flame({ cx = 32, cy = 28, s = 1 }: { cx?: number; cy?: number; s?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s}) translate(-32 -28)`}>
      <path d={FLAME} fill={COLORS.red} />
      <path d={FLAME_CORE} fill={COLORS.yellow} stroke="none" />
    </g>
  );
}

/** First correct answer. */
export function BadgeFirstCorrect(props: BadgeProps) {
  return (
    <BadgeBase tone="greenTint" {...props}>
      <path d="M22 29l7 7 13-14" strokeWidth={4.5} stroke={COLORS.green} />
    </BadgeBase>
  );
}

/** 5 correct in a row. */
export function BadgeStreak5(props: BadgeProps) {
  return (
    <BadgeBase tone="yellowTint" {...props}>
      <Flame />
    </BadgeBase>
  );
}

/** 10 correct in a row: a double flame. */
export function BadgeStreak10(props: BadgeProps) {
  return (
    <BadgeBase tone="redTint" {...props}>
      <Flame cx={24} cy={31} s={0.7} />
      <Flame cx={40} cy={31} s={0.7} />
    </BadgeBase>
  );
}

/** 10 verbs practised. */
export function BadgeVerbs10(props: BadgeProps) {
  return (
    <BadgeBase tone="blueTint" {...props}>
      <path d="M35 12 21 32h9l-3 16 15-22h-9z" fill={COLORS.yellow} />
    </BadgeBase>
  );
}

/** 10 sentences built. */
export function BadgeSentences10(props: BadgeProps) {
  return (
    <BadgeBase tone="greenTint" {...props}>
      <path
        d="M18 18h28a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3H33l-8 7v-7h-7a3 3 0 0 1-3-3V21a3 3 0 0 1 3-3z"
        fill={COLORS.white}
      />
      <path d="M23 25h18M23 32h11" />
    </BadgeBase>
  );
}

/** Daily visit. */
export function BadgeDaily(props: BadgeProps) {
  return (
    <BadgeBase tone="yellowTint" {...props}>
      <rect x={18} y={17} width={28} height={26} rx={5} fill={COLORS.white} />
      <path d="M18 25v-3a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v3z" fill={COLORS.red} />
      <path d="M26 14v6M38 14v6" />
      <circle cx={32} cy={34} r={4.5} fill={COLORS.yellow} />
    </BadgeBase>
  );
}

/** 3 grammar lessons finished: an open book. */
export function BadgeGrammar3(props: BadgeProps) {
  return (
    <BadgeBase tone="blueTint" {...props}>
      <path d="M32 21c-3-2-9-3-13-2v21c4-1 10 0 13 2 3-2 9-3 13-2V19c-4-1-10 0-13 2z" fill={COLORS.white} />
      <path d="M32 21v21M23 26h5M23 31h5M36 26h5M36 31h5" />
    </BadgeBase>
  );
}

/** 5 dialogues passed: two speech bubbles. */
export function BadgeDialogue5(props: BadgeProps) {
  return (
    <BadgeBase tone="greenTint" {...props}>
      <path d="M17 17h20a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H27l-6 5v-5h-4a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3z" fill={COLORS.white} />
      <path d="M30 31h14a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2v4l-5-4h-7a3 3 0 0 1-3-3v-6a3 3 0 0 1 3-3z" fill={COLORS.yellow} />
    </BadgeBase>
  );
}

/** 5 reading texts passed: a stack of books. */
export function BadgeReading5(props: BadgeProps) {
  return (
    <BadgeBase tone="yellowTint" {...props}>
      <rect x={17} y={35} width={30} height={8} rx={2} fill={COLORS.blue} />
      <rect x={20} y={26} width={26} height={9} rx={2} fill={COLORS.red} />
      <rect x={18} y={17} width={27} height={9} rx={2} fill={COLORS.green} />
      <path d="M24 39h8M26 30h8M23 21h8" stroke={COLORS.white} strokeWidth={2} />
    </BadgeBase>
  );
}

/** 50 review answers: a flashcard with a tick. */
export function BadgeReview50(props: BadgeProps) {
  return (
    <BadgeBase tone="redTint" {...props}>
      <rect x={20} y={16} width={22} height={28} rx={4} fill={COLORS.yellow} transform="rotate(-9 31 30)" />
      <rect x={23} y={15} width={22} height={28} rx={4} fill={COLORS.white} />
      <path d="M29 29l4 4 8-9" strokeWidth={4} stroke={COLORS.green} />
    </BadgeBase>
  );
}

/** 7 days in a row: a calendar with a seven. */
export function BadgeStreak7(props: BadgeProps) {
  return (
    <BadgeBase tone="greenTint" {...props}>
      <rect x={17} y={17} width={30} height={27} rx={5} fill={COLORS.white} />
      <path d="M17 26v-4a5 5 0 0 1 5-5h20a5 5 0 0 1 5 5v4z" fill={COLORS.green} />
      <path d="M25 14v6M39 14v6" />
      <path d="M26 31h12l-6 11" strokeWidth={4} />
    </BadgeBase>
  );
}

/** 25 mature cards: a gem. */
export function BadgeMature25(props: BadgeProps) {
  return (
    <BadgeBase tone="blueTint" {...props}>
      <path d="M24 19h16l7 9-15 16-15-16z" fill={COLORS.blue} />
      <path d="M17 28h30M24 19l8 9 8-9M32 28v16" stroke={COLORS.white} strokeWidth={2} />
    </BadgeBase>
  );
}
