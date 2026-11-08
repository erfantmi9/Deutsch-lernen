import { COLORS } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";

export type Mood =
  | "happy"
  | "waving"
  | "cheering"
  | "thinking"
  | "sad"
  | "sleeping"
  | "reading"
  | "listening"
  | "writing"
  | "surprised"
  | "love"
  | "proud"
  | "hello"
  | "celebrating"
  | "studying"
  | "speaking"
  | "searching"
  | "counting"
  | "playing"
  | "oops"
  | "trophy"
  | "pretzel";

export const MOODS: readonly Mood[] = [
  "happy", "waving", "cheering", "thinking", "sad", "sleeping",
  "reading", "listening", "writing", "surprised", "love", "proud",
  "hello", "celebrating", "studying", "speaking", "searching", "counting", "playing", "oops", "trophy", "pretzel",
];

/*
 * Deutschi (دویچی), the Doch! mascot: a chubby dachshund puppy in three-quarter view, facing the reading direction's
 * end (right in the 120x120 space; RTL pages mirror whole scenes, not the mascot). Big head, big shiny eyes, short
 * sausage body and stubby legs. Flat brand style like the logo: no outlines. Each mood changes pose, face and props.
 */

const INK = "#2B2118";
const C = {
  coat: COLORS.brown,
  ear: COLORS.brownDark,
  muzzle: COLORS.tan,
  collar: "#E4572E",
  tag: "#F6C445",
  blush: "#F28B82",
  belly: "#E8B77E",
  tongue: "#F07A7A",
  white: "#FFFFFF",
  blue: COLORS.blue,
  blueTint: COLORS.blueTint,
  green: COLORS.green,
  yellow: "#F6C445",
};

type Eye = "open" | "up" | "down" | "closed" | "wide" | "sleep" | "heart" | "teary" | "squint";
type Ear = "down" | "back" | "flat" | "up";
type Legs = "stand" | "wave" | "jump" | "tuck" | "hold" | "write" | "raise";
type Mouth = "smile" | "tongue" | "open" | "sad" | "o" | "flat";
type Brow = "none" | "sad" | "raised";

type Pose = {
  eye: Eye;
  ear: Ear;
  legs: Legs;
  mouth: Mouth;
  brow?: Brow;
  tail: string;
  lift?: number;
  headTilt?: number;
  headDrop?: number;
};

const TAIL_WAG = "M21 76C13 72 11 64 15 58";
const POSES: Record<Mood, Pose> = {
  happy: { eye: "open", ear: "down", legs: "stand", mouth: "tongue", tail: TAIL_WAG },
  waving: { eye: "open", ear: "down", legs: "wave", mouth: "smile", tail: TAIL_WAG, headTilt: 4 },
  cheering: { eye: "closed", ear: "back", legs: "jump", mouth: "open", tail: "M21 74C11 68 9 58 14 50", lift: 8 },
  thinking: { eye: "up", ear: "down", legs: "stand", mouth: "flat", brow: "raised", tail: "M21 78C13 78 9 73 10 67", headTilt: -8 },
  sad: { eye: "teary", ear: "flat", legs: "stand", mouth: "sad", brow: "sad", tail: "M21 82C15 87 13 93 13 98", headDrop: 3 },
  sleeping: { eye: "sleep", ear: "flat", legs: "tuck", mouth: "flat", tail: "M22 92C14 95 12 99 17 101", headDrop: 12 },
  reading: { eye: "down", ear: "down", legs: "hold", mouth: "smile", tail: TAIL_WAG, headTilt: 5 },
  listening: { eye: "closed", ear: "down", legs: "stand", mouth: "smile", tail: TAIL_WAG, headTilt: -6 },
  writing: { eye: "down", ear: "down", legs: "write", mouth: "flat", tail: TAIL_WAG, headTilt: 6 },
  surprised: { eye: "wide", ear: "up", legs: "stand", mouth: "o", tail: "M21 74C15 64 17 56 21 50" },
  love: { eye: "heart", ear: "down", legs: "stand", mouth: "smile", tail: TAIL_WAG, headTilt: -5 },
  proud: { eye: "closed", ear: "down", legs: "stand", mouth: "tongue", tail: TAIL_WAG },
  hello: { eye: "open", ear: "down", legs: "wave", mouth: "tongue", tail: TAIL_WAG, headTilt: -4 },
  celebrating: { eye: "closed", ear: "back", legs: "jump", mouth: "open", tail: "M21 74C11 68 9 58 14 50", lift: 6 },
  studying: { eye: "open", ear: "down", legs: "stand", mouth: "smile", tail: TAIL_WAG },
  speaking: { eye: "open", ear: "down", legs: "stand", mouth: "open", tail: TAIL_WAG, headTilt: -3 },
  searching: { eye: "down", ear: "down", legs: "raise", mouth: "o", brow: "raised", tail: TAIL_WAG, headTilt: 6 },
  counting: { eye: "up", ear: "down", legs: "stand", mouth: "smile", tail: TAIL_WAG, headTilt: -6 },
  playing: { eye: "open", ear: "back", legs: "stand", mouth: "tongue", tail: "M21 74C11 68 9 58 14 50", headTilt: 8 },
  oops: { eye: "squint", ear: "flat", legs: "stand", mouth: "flat", brow: "sad", tail: "M21 78C13 78 9 73 10 67" },
  trophy: { eye: "closed", ear: "back", legs: "raise", mouth: "open", tail: TAIL_WAG, lift: 4 },
  pretzel: { eye: "closed", ear: "down", legs: "raise", mouth: "smile", tail: TAIL_WAG, headTilt: 4 },
};

const leg = (x: number, near: boolean) => <rect x={x} y={86} width={10} height={15} rx={5} fill={near ? C.coat : C.ear} />;

function Legs({ legs }: { legs: Legs }) {
  if (legs === "tuck") return null;
  if (legs === "jump")
    return (
      <>
        <rect x={22} y={84} width={10} height={13} rx={5} fill={C.ear} transform="rotate(28 27 86)" />
        <rect x={33} y={84} width={10} height={13} rx={5} fill={C.coat} transform="rotate(28 38 86)" />
        <rect x={60} y={84} width={10} height={13} rx={5} fill={C.ear} transform="rotate(-28 65 86)" />
        <rect x={70} y={84} width={10} height={13} rx={5} fill={C.coat} transform="rotate(-28 75 86)" />
      </>
    );
  return (
    <>
      {leg(23, false)}
      {leg(34, true)}
      {leg(61, false)}
      {legs === "stand" ? leg(71, true) : null}
    </>
  );
}

/** Stubby paw raised in front of the chest, with a light pad so it reads against the coat. */
const arm = (x2: number, y2: number) => (
  <>
    <path d={`M74 86L${x2} ${y2}`} stroke={C.coat} strokeWidth={10} />
    <circle cx={x2} cy={y2} r={5} fill={C.muzzle} />
  </>
);

function Arm({ legs }: { legs: Legs }) {
  if (legs === "wave") return arm(109, 75);
  if (legs === "hold") return arm(88, 84);
  if (legs === "raise") return arm(100, 79);
  if (legs === "write") return arm(90, 92);
  return null;
}

/** The ear on the near side of the head (left in the 3/4 view). */
function NearEar({ ear }: { ear: Ear }) {
  if (ear === "back") return <ellipse cx={58} cy={42} rx={8.5} ry={17} fill={C.ear} transform="rotate(70 58 42)" />;
  if (ear === "flat") return <ellipse cx={61} cy={60} rx={8.5} ry={18} fill={C.ear} transform="rotate(6 61 60)" />;
  if (ear === "up") return <ellipse cx={61} cy={36} rx={8.5} ry={16} fill={C.ear} transform="rotate(-38 61 36)" />;
  return <ellipse cx={61} cy={56} rx={9} ry={18} fill={C.ear} transform="rotate(16 61 56)" />;
}

/** The far ear peeks out behind the top of the head. */
function FarEar({ ear }: { ear: Ear }) {
  const rot = ear === "back" ? 40 : ear === "up" ? -55 : ear === "flat" ? -5 : -28;
  return <ellipse cx={98} cy={32} rx={7} ry={12} fill={C.ear} transform={`rotate(${rot} 98 34)`} />;
}

const EYES = [
  { cx: 79, cy: 47, rx: 5.6, ry: 6.6 },
  { cx: 94, cy: 45, rx: 5, ry: 6 },
];

const heartPath = (x: number, y: number, s: number) =>
  `M${x} ${y + 3 * s}c${-3 * s} ${-3.2 * s} ${-6 * s} ${-1.4 * s} ${-6 * s} ${-4 * s}c0 ${-1.8 * s} ${1.4 * s} ${-3 * s} ${3 * s} ${-3 * s}` +
  `c${1.2 * s} 0 ${2.4 * s} ${0.7 * s} ${3 * s} ${1.8 * s}c${0.6 * s} ${-1.1 * s} ${1.8 * s} ${-1.8 * s} ${3 * s} ${-1.8 * s}` +
  `c${1.6 * s} 0 ${3 * s} ${1.2 * s} ${3 * s} ${3 * s}c0 ${2.6 * s} ${-3 * s} ${0.8 * s} ${-6 * s} ${4 * s}z`;

function Eyes({ eye }: { eye: Eye }) {
  if (eye === "squint")
    return (
      <g stroke={INK} strokeWidth={2.6} fill="none">
        <path d="M75 43.5l6 3.5-6 3.5" />
        <path d="M97 41.5l-5.5 3.5 5.5 3.5" />
      </g>
    );
  if (eye === "closed" || eye === "sleep") {
    const d = eye === "closed" ? -5 : 4;
    return (
      <g stroke={INK} strokeWidth={2.6} fill="none">
        {EYES.map((e, i) => (
          <path key={i} d={`M${e.cx - e.rx + 1} ${e.cy + 1}q${e.rx - 1} ${d} ${2 * (e.rx - 1)} 0`} />
        ))}
      </g>
    );
  }
  if (eye === "heart")
    return (
      <>
        {EYES.map((e, i) => (
          <path key={i} d={heartPath(e.cx, e.cy - 1, i === 0 ? 1.25 : 1.1)} fill={C.collar} />
        ))}
      </>
    );
  if (eye === "wide")
    return (
      <>
        {EYES.map((e, i) => (
          <g key={i}>
            <circle cx={e.cx} cy={e.cy} r={e.rx + 1.6} fill={C.white} />
            <circle cx={e.cx + 0.6} cy={e.cy} r={e.rx - 2.2} fill={INK} />
            <circle cx={e.cx + 1.6} cy={e.cy - 1.2} r={1} fill={C.white} />
          </g>
        ))}
      </>
    );
  const dy = eye === "up" ? -1.8 : eye === "down" ? 1.8 : 0;
  const teary = eye === "teary";
  return (
    <>
      {EYES.map((e, i) => (
        <g key={i}>
          <ellipse cx={e.cx} cy={e.cy + dy} rx={e.rx} ry={e.ry} fill={INK} />
          <circle cx={e.cx + e.rx * 0.32} cy={e.cy + dy - e.ry * 0.36} r={teary ? 2.4 : 2.1} fill={C.white} />
          <circle cx={e.cx - e.rx * 0.35} cy={e.cy + dy + e.ry * 0.38} r={teary ? 1.4 : 1} fill={C.white} />
          {teary && <path d={`M${e.cx - e.rx + 1} ${e.cy + dy + e.ry - 1}q${e.rx - 1} 2 ${2 * (e.rx - 1)} 0`} stroke={C.blue} strokeWidth={1.4} opacity={0.6} />}
        </g>
      ))}
    </>
  );
}

function Brows({ brow }: { brow: Brow }) {
  if (brow === "sad")
    return (
      <g stroke={INK} strokeWidth={2} opacity={0.75}>
        <path d="M74 37.5l8-3" />
        <path d="M90.5 33.5l7 2.5" />
      </g>
    );
  if (brow === "raised")
    return (
      <g stroke={INK} strokeWidth={2} opacity={0.75} fill="none">
        <path d="M74 36q5-4 10-1" />
        <path d="M90 35.5l7 .5" />
      </g>
    );
  return null;
}

/** Mouth on the muzzle (muzzle centre ≈ 98,61). */
function Mouth({ mouth }: { mouth: Mouth }) {
  switch (mouth) {
    case "tongue":
      return (
        <>
          <path d="M96 66.5q3 5.5 6 0z" fill={C.tongue} />
          <path d="M92.5 63.5q3 3.6 6 0q3 3.6 6 0" stroke={INK} strokeWidth={1.8} fill="none" />
        </>
      );
    case "smile":
      return <path d="M92.5 63.5q3 3.6 6 0q3 3.6 6 0" stroke={INK} strokeWidth={1.8} fill="none" />;
    case "open":
      return (
        <>
          <path d="M92 62.5q6.5 11 13 0z" fill={INK} />
          <path d="M95 66.5q3.5 4.5 7 0z" fill={C.tongue} />
        </>
      );
    case "sad":
      return <path d="M93.5 66.5q5-4 10 0" stroke={INK} strokeWidth={1.8} fill="none" />;
    case "o":
      return <ellipse cx={98.5} cy={65.5} rx={2.6} ry={3.2} fill={INK} />;
    default:
      return <path d="M95 65h7" stroke={INK} strokeWidth={1.8} />;
  }
}

/** Props drawn behind the dog. */
function Behind({ mood }: { mood: Mood }) {
  if (mood === "hello")
    return (
      <>
        <rect x={4} y={6} width={46} height={22} rx={11} fill={C.blueTint} />
        <path d="M38 27l8 9-1-9z" fill={C.blueTint} />
        <text x={27} y={21.5} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.blue} fontFamily="inherit">
          Hallo!
        </text>
      </>
    );
  if (mood === "counting")
    return (
      <>
        {[
          { x: 14, y: 24, n: "1", c: C.blue },
          { x: 34, y: 12, n: "2", c: C.collar },
          { x: 56, y: 20, n: "3", c: C.green },
        ].map((d) => (
          <g key={d.n}>
            <circle cx={d.x} cy={d.y} r={8} fill={d.c} />
            <text x={d.x} y={d.y + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.white} fontFamily="inherit">
              {d.n}
            </text>
          </g>
        ))}
      </>
    );
  if (mood === "speaking")
    return (
      <>
        <rect x={98} y={4} width={21} height={15} rx={7.5} fill={C.blueTint} />
        <path d="M103 18l-3 7 8-7z" fill={C.blueTint} />
        <circle cx={103.5} cy={11.5} r={1.7} fill={C.blue} />
        <circle cx={108.5} cy={11.5} r={1.7} fill={C.blue} />
        <circle cx={113.5} cy={11.5} r={1.7} fill={C.blue} />
      </>
    );
  if (mood === "thinking")
    return (
      <>
        <circle cx={54} cy={28} r={2.4} fill={C.blueTint} />
        <circle cx={44} cy={20} r={3.8} fill={C.blueTint} />
        <circle cx={26} cy={16} r={11} fill={C.blueTint} />
        <path d="M22 12.5a4 4 0 1 1 5.6 3.7c-1.2.6-1.6 1.4-1.6 2.6" stroke={C.blue} strokeWidth={2.4} fill="none" />
        <circle cx={26} cy={22.6} r={1.3} fill={C.blue} />
      </>
    );
  return null;
}

/** Props drawn in front of the dog. */
function Front({ mood }: { mood: Mood }) {
  switch (mood) {
    case "waving":
      return (
        <g stroke={INK} strokeWidth={1.6} fill="none">
          <path d="M114 68q3 4 1.5 9" opacity={0.4} />
          <path d="M117 64q3.5 6 1.5 14" opacity={0.25} />
        </g>
      );
    case "cheering":
      return (
        <>
          <rect x={24} y={22} width={5} height={8} rx={1.5} fill={C.blue} transform="rotate(-20 26 26)" />
          <rect x={52} y={10} width={5} height={8} rx={1.5} fill={C.collar} transform="rotate(25 54 14)" />
          <rect x={108} y={18} width={5} height={8} rx={1.5} fill={C.green} transform="rotate(-30 110 22)" />
          <circle cx={40} cy={36} r={2.4} fill={C.yellow} />
          <circle cx={74} cy={10} r={2.4} fill={C.blue} />
          <circle cx={12} cy={44} r={2} fill={C.collar} />
          <circle cx={112} cy={40} r={2} fill={C.yellow} />
        </>
      );
    case "sad":
      return <path d="M77 57c-2.4 3.4-2.4 6.4 0 6.4s2.4-3 0-6.4z" fill={C.blue} opacity={0.75} />;
    case "sleeping":
      return (
        <g stroke={INK} strokeWidth={2} opacity={0.5} fill="none">
          <path d="M104 40h6.5l-6.5 7.5h6.5" />
          <path d="M113 27h5l-5 5.5h5" />
        </g>
      );
    case "reading":
      return (
        <>
          <path d="M82 74l13 3.5v16L82 90z" fill={C.blue} />
          <path d="M95 77.5l13-4.5v16l-13 4.5z" fill={C.blue} />
          <path d="M83.5 74.6l11.5 3.2v13.8l-11.5-3.2z" fill={C.white} />
          <path d="M95 77.8l11.5-4v13.8l-11.5 4z" fill={C.white} />
          <path d="M86 79.5l6 1.6M86 83l6 1.6M97.5 80.5l6-2M97.5 84l6-2" stroke={C.blueTint} strokeWidth={1.3} />
          <circle cx={84} cy={88} r={4.6} fill={C.muzzle} />
        </>
      );
    case "listening":
      return (
        <>
          <path d="M60 50a26 26 0 0 1 44-14" stroke={INK} strokeWidth={4.5} fill="none" />
          <rect x={54} y={44} width={13} height={19} rx={6.5} fill={C.collar} />
          <ellipse cx={112} cy={30} rx={3.2} ry={2.4} fill={C.blue} />
          <path d="M114.8 29.5V19.5l4 1.6" stroke={C.blue} strokeWidth={1.7} fill="none" />
          <ellipse cx={38} cy={30} rx={2.8} ry={2.1} fill={C.green} />
          <path d="M40.4 29.6V21.5" stroke={C.green} strokeWidth={1.7} />
        </>
      );
    case "writing":
      return (
        <>
          <path d="M84 96l28-3.5 1.2 9.5-28 3.5z" fill={C.blueTint} />
          <path d="M89 99l18-2.2M89.6 102.3l13-1.6" stroke={C.blue} strokeWidth={1.2} opacity={0.5} />
          <path d="M92 88l10 9" stroke={C.yellow} strokeWidth={3.8} />
          <path d="M102 97l2.8 2.5-3.6-.6z" fill={INK} />
          <path d="M90.6 86.8l2.4-2.6 1.8 1.6-2.4 2.6z" fill={C.blush} />
        </>
      );
    case "surprised":
      return (
        <g stroke={INK} strokeWidth={2} opacity={0.5} fill="none">
          <path d="M80 18l-1-6M90 18l3-5.5M70 21l-4-4" />
        </g>
      );
    case "love":
      return (
        <>
          <path d={heartPath(108, 20, 1.3)} fill={C.collar} />
          <path d={heartPath(48, 26, 0.9)} fill={C.blush} />
          <path d={heartPath(114, 40, 0.7)} fill={C.blush} />
        </>
      );
    case "proud":
      return (
        <>
          <path d="M79 76l5 10 5-10z" fill={C.blue} />
          <circle cx={84} cy={89} r={6.5} fill={C.yellow} />
          <path d="M84 85.3l1.1 2.3 2.5.4-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.4z" fill={C.white} />
          <path d="M108 22l1.5 3.2 3.2 1.5-3.2 1.5-1.5 3.2-1.5-3.2-3.2-1.5 3.2-1.5z" fill={C.yellow} />
          <path d="M60 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill={C.yellow} />
        </>
      );
    case "hello":
      return (
        <g stroke={INK} strokeWidth={1.6} fill="none">
          <path d="M114 68q3 4 1.5 9" opacity={0.4} />
          <path d="M117 64q3.5 6 1.5 14" opacity={0.25} />
        </g>
      );
    case "celebrating":
      return (
        <>
          <path d="M72 28L86 2l12 24z" fill={C.blue} />
          <path d="M77 18.5l13.5 2.5M81 10.5l10 2" stroke={C.yellow} strokeWidth={2.4} />
          <circle cx={86} cy={3} r={3.6} fill={C.collar} />
          <path d="M28 30q6-10 2-18M40 20q8-4 10-12" stroke={C.green} strokeWidth={2} fill="none" />
          <rect x={18} y={40} width={5} height={8} rx={1.5} fill={C.blue} transform="rotate(-20 20 44)" />
          <rect x={108} y={20} width={5} height={8} rx={1.5} fill={C.collar} transform="rotate(30 110 24)" />
          <circle cx={58} cy={14} r={2.4} fill={C.yellow} />
          <circle cx={112} cy={44} r={2.2} fill={C.green} />
        </>
      );
    case "studying":
      return (
        <>
          <path d="M74 27v6q12 6 24 0v-6z" fill={INK} />
          <path d="M64 24l22-9 22 9-22 9z" fill={INK} />
          <path d="M86 24l18 3v10" stroke={C.yellow} strokeWidth={2} fill="none" />
          <circle cx={104} cy={38} r={2.4} fill={C.yellow} />
        </>
      );
    case "speaking":
      return (
        <g stroke={C.blue} strokeWidth={1.8} fill="none" opacity={0.6}>
          <path d="M113 60q3 4 0 8" />
          <path d="M117 57q4.5 7 0 14" />
        </g>
      );
    case "searching":
      return (
        <>
          <path d="M100 79l4.5-5" stroke={INK} strokeWidth={4.5} />
          <circle cx={109} cy={67} r={10} fill={C.blueTint} opacity={0.55} />
          <circle cx={109} cy={67} r={10} stroke={INK} strokeWidth={3.4} fill="none" />
          <path d="M103.5 63q2.2-3.4 6-3.6" stroke={C.white} strokeWidth={2} fill="none" />
          <circle cx={100} cy={79} r={5.6} fill={C.muzzle} />
        </>
      );
    case "counting":
      return null;
    case "playing":
      return (
        <>
          <circle cx={108} cy={95} r={8} fill={C.collar} />
          <path d="M102 92q6-4 12 0" stroke={C.white} strokeWidth={2} fill="none" opacity={0.75} />
          <path d="M96 100h-6M98 104h-8" stroke={INK} strokeWidth={1.6} opacity={0.3} />
        </>
      );
    case "oops":
      return (
        <>
          <path d="M106 26c-3.2 4.4-3.2 8.2 0 8.2s3.2-3.8 0-8.2z" fill={C.blue} opacity={0.8} />
          <path d="M60 22l2 4M68 18l.5 4.5" stroke={INK} strokeWidth={1.8} opacity={0.4} />
        </>
      );
    case "trophy":
      return (
        <>
          <g transform="translate(107 72) scale(1.3) translate(-107 -72)">
          <path d="M98 60h18v6q0 9-9 10-9-1-9-10z" fill={C.yellow} />
          <path d="M98 62h-3.5q0 6 4 7M116 62h3.5q0 6-4 7" stroke={C.yellow} strokeWidth={2.4} fill="none" />
          <rect x={105} y={75} width={4} height={6} fill="#E8A92E" />
          <rect x={101} y={80} width={12} height={4} rx={1.5} fill="#E8A92E" />
          <path d="M103 64q1 5 4 7" stroke={C.white} strokeWidth={1.6} fill="none" opacity={0.7} />
          </g>
          <circle cx={100} cy={82} r={5.6} fill={C.muzzle} />
          <path d="M112 44l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill={C.yellow} />
          <path d="M60 18l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill={C.yellow} />
        </>
      );
    case "pretzel":
      return (
        <>
          <g transform="translate(-6 -6)">
            <path
              d="M100 84c-8-2-10-12-3-15 6-2 9 5 9 9 0-4 3-11 9-9 7 3 5 13-3 15M101 84q5-9 10 0"
              stroke="#B5651D"
              strokeWidth={4.4}
              fill="none"
            />
            <circle cx={103} cy={72} r={1} fill={C.white} />
            <circle cx={110} cy={74} r={1} fill={C.white} />
          </g>
          <circle cx={94} cy={82} r={5.6} fill={C.muzzle} />
          <circle cx={92} cy={100} r={1} fill="#B5651D" />
          <circle cx={97} cy={102} r={0.8} fill="#B5651D" />
        </>
      );
    default:
      return null;
  }
}

/** The mascot drawing in a 120x120 coordinate space, for embedding in larger scenes. */
export function MascotArt({ mood }: { mood: Mood }) {
  const p = POSES[mood];
  const lift = p.lift ?? 0;
  const lying = p.legs === "tuck";
  const bodyY = lying ? 76 : 66;
  const head =
    [p.headDrop ? `translate(0 ${p.headDrop})` : "", p.headTilt ? `rotate(${p.headTilt} 84 54)` : ""].join(" ").trim() ||
    undefined;

  return (
    <g stroke="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Ground shadow shrinks while jumping. */}
      <ellipse cx={56} cy={103} rx={lift ? 26 : 36} ry={3.5} fill={INK} opacity={0.08} />
      <Behind mood={mood} />
      <g transform={lift ? `translate(0 ${-lift})` : undefined}>
        <path d={p.tail} stroke={C.coat} strokeWidth={6.5} fill="none" />
        <g transform={lying ? "translate(0 12)" : undefined}>
          <Legs legs={p.legs} />
        </g>
        {/* Short, chubby sausage body with a lighter belly. */}
        <rect x={17} y={bodyY} width={68} height={28} rx={14} fill={C.coat} />
        <ellipse cx={50} cy={bodyY + 22} rx={23} ry={4} fill={C.belly} />
        {p.legs !== "wave" && <Arm legs={p.legs} />}
        <g transform={head}>
          <FarEar ear={p.ear} />
          {/* Big round head. */}
          <circle cx={84} cy={50} r={26} fill={C.coat} />
          {/* Collar peeking under the chin; the tag gives way to the medal when proud. */}
          <path d="M70 73q14 8 28 0" stroke={C.collar} strokeWidth={5} fill="none" />
          {mood !== "proud" && <circle cx={84} cy={79.5} r={3.4} fill={C.tag} />}
          <ellipse cx={98} cy={61} rx={13.5} ry={10} fill={C.muzzle} />
          <ellipse cx={105} cy={55} rx={4.6} ry={3.6} fill={INK} />
          <ellipse cx={106.4} cy={53.9} rx={1.5} ry={1} fill={C.white} opacity={0.8} />
          <NearEar ear={p.ear} />
          <Eyes eye={p.eye} />
          <Brows brow={p.brow ?? "none"} />
          <ellipse cx={75} cy={59} rx={4.4} ry={2.8} fill={C.blush} opacity={mood === "love" ? 0.9 : 0.6} />
          <Mouth mouth={p.mouth} />
        </g>
        {p.legs === "wave" && <Arm legs={p.legs} />}
        <Front mood={mood} />
      </g>
    </g>
  );
}

export type MascotProps = IllustrationProps & { mood?: Mood };

export default function Mascot({ mood = "happy", size = 120, className, title }: MascotProps) {
  return (
    <Svg viewBox="0 0 120 120" size={size} className={className} title={title}>
      <MascotArt mood={mood} />
    </Svg>
  );
}
