import { INK, COLORS } from "../palette";
import type { Look } from "./looks";

/*
 * Head-and-shoulders portrait on a 64x64 canvas, meant to be clipped by a round frame.
 * Flat fills, navy outline like the other illustrations. Drawing order: hair behind the head, shoulders, neck, ears,
 * head, face, hair in front, accessories.
 */

const HEAD = { cx: 32, cy: 29, rx: 12.5, ry: 13.5 };
const CHEEK = "#F28B82";

/** Hair behind the head (long styles, ponytail, bun). */
function BackHair({ look }: { look: Look }) {
  const f = look.hair;
  switch (look.style) {
    case "long":
      return <path d="M18.5 28C17.5 15 25 11.5 32 11.5S46.5 15 45.5 28l1.5 18c-3.5 2.5-8 2-9.5-1.5H26.5c-1.5 3.5-6 4-9.5 1.5z" fill={f} />;
    case "bob":
      return <path d="M18.5 29C17.5 16 25 12 32 12s14.5 4 13.5 17l.5 9.5c-2.5 1.5-5.5 1.5-7.5 0h-13c-2 1.5-5 1.5-7.5 0z" fill={f} />;
    case "ponytail":
      return <path d="M42 18c8 1 10.5 11 7.5 20-1 3-3.5 4.5-5 3.5 1.5-6 .5-13-3-18z" fill={f} />;
    case "bun":
      return <circle cx={32} cy={11.5} r={5.5} fill={f} />;
    default:
      return null;
  }
}

/** Hair in front: the part that frames the face. */
function FrontHair({ look }: { look: Look }) {
  const f = look.hair;
  switch (look.style) {
    case "short":
      return <path d="M19.5 30C18.5 18 24.5 14 32 14s13.5 4 12.5 16c-1.5-5-3-7.5-5.5-8.5-4 1.5-11 1.5-14.5 0-2.5 1-4 3.5-5 8.5z" fill={f} />;
    case "side":
      return <path d="M19.5 31C18 18 25 13.5 32.5 13.5c7.5 0 13 4.5 12 17.5-1-5-3-9-7-10.5-5.5 2.5-12 4-18 10.5z" fill={f} />;
    case "curly":
      return (
        <g fill={f}>
          <circle cx={21} cy={25} r={4.6} />
          <circle cx={43} cy={25} r={4.6} />
          <circle cx={24} cy={18.5} r={5.2} />
          <circle cx={40} cy={18.5} r={5.2} />
          <circle cx={32} cy={15.5} r={5.8} />
        </g>
      );
    case "bun":
    case "ponytail":
      return <path d="M19.5 30C18.5 18 24.5 14 32 14s13.5 4 12.5 16c-2.5-5.5-6-8-12.5-8.5-6.5.5-10 3-12.5 8.5z" fill={f} />;
    case "long":
    case "bob":
      return <path d="M19.5 31C19 19 25 15 32 15s13 4 12.5 16c-3-3.5-6.5-7-10-9.5-3 4-9 7.5-15 9.5z" fill={f} />;
    case "bald":
      return (
        <g fill={f}>
          <path d="M19.5 33c-1.5-5-.5-9 2-11.5l1 10z" />
          <path d="M44.5 33c1.5-5 .5-9-2-11.5l-1 10z" />
        </g>
      );
  }
}

export default function Portrait({ look, size = 44 }: { look: Look; size?: number }) {
  const has = (e: NonNullable<Look["extras"]>[number]) => look.extras?.includes(e) ?? false;
  const beard = has("beard");
  const mouthInk = beard || has("moustache") ? "#FFFFFF" : INK;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke={INK}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <BackHair look={look} />

      {/* shoulders with a round neckline */}
      <rect x={27} y={36} width={10} height={14} fill={look.skin} />
      <path d="M7 66c0-12 9-18.5 19-19.5q6 5 12 0c10 1 19 7.5 19 19.5z" fill={look.shirt} />
      {has("apron") && (
        <g>
          <path d="M23.5 53h17l2 13h-21z" fill={COLORS.white} />
          <path d="M24.5 53l2.5-6M39.5 53l-2.5-6" strokeWidth={1.4} />
        </g>
      )}
      {has("tie") && <path d="M32 48l-2.2 3 2.2 11 2.2-11z" fill={COLORS.red} strokeWidth={1.4} />}
      {has("bowtie") && <path d="M32 49.5l-5.5-3v6zM32 49.5l5.5-3v6z" fill={COLORS.red} strokeWidth={1.4} />}

      {/* ears and head */}
      <circle cx={19.6} cy={30} r={2.7} fill={look.skin} />
      <circle cx={44.4} cy={30} r={2.7} fill={look.skin} />
      <ellipse {...HEAD} fill={look.skin} />

      {/* beard under the face features */}
      {beard && <path d="M19.8 31c.5 9.5 5.5 13.5 12.2 13.5S43.7 40.5 44.2 31c-2 5-6 6.5-12.2 6.5S21.8 36 19.8 31z" fill={look.hair} />}

      {/* face */}
      <g stroke="none">
        <circle cx={24.5} cy={34} r={2.1} fill={CHEEK} opacity={0.45} />
        <circle cx={39.5} cy={34} r={2.1} fill={CHEEK} opacity={0.45} />
        <ellipse cx={27.2} cy={29.5} rx={1.5} ry={1.8} fill={INK} />
        <ellipse cx={36.8} cy={29.5} rx={1.5} ry={1.8} fill={INK} />
        <circle cx={27.7} cy={28.9} r={0.5} fill={COLORS.white} />
        <circle cx={37.3} cy={28.9} r={0.5} fill={COLORS.white} />
      </g>
      <path d="M25 25.6q2.2-1.2 4.4 0M34.6 25.6q2.2-1.2 4.4 0" strokeWidth={1.3} />
      <path d="M32 31.2q1.4 1.6 0 2.4" strokeWidth={1.2} opacity={0.55} />
      {has("moustache") && <path d="M27.5 35.6c1.5-1.6 3.2-1.6 4.5-.4 1.3-1.2 3-1.2 4.5.4-1.5 1-3 1.1-4.5.4-1.5.7-3 .6-4.5-.4z" fill={look.hair} strokeWidth={1.2} />}
      <path d="M28.6 37.2q3.4 2.8 6.8 0" strokeWidth={1.6} stroke={mouthInk} />

      <FrontHair look={look} />

      {has("glasses") && (
        <g strokeWidth={1.5}>
          <circle cx={27.2} cy={29.5} r={3.6} fill={COLORS.white} fillOpacity={0.25} />
          <circle cx={36.8} cy={29.5} r={3.6} fill={COLORS.white} fillOpacity={0.25} />
          <path d="M30.8 29.3q1.2-.8 2.4 0M23.6 29l-3.6-1M40.4 29l3.6-1" />
        </g>
      )}
      {has("earrings") && (
        <g fill={COLORS.yellow} strokeWidth={1}>
          <circle cx={19.4} cy={34.2} r={1.3} />
          <circle cx={44.6} cy={34.2} r={1.3} />
        </g>
      )}
      {has("headset") && (
        <g>
          <path d="M18.5 29C18.5 12 45.5 12 45.5 29" strokeWidth={2} />
          <rect x={16.2} y={26} width={4.6} height={7.5} rx={2} fill={INK} />
          <rect x={43.2} y={26} width={4.6} height={7.5} rx={2} fill={INK} />
          <path d="M18.5 33c.5 4.5 3.5 6.5 7.5 6" strokeWidth={1.4} />
          <circle cx={26.5} cy={39} r={1.3} fill={INK} />
        </g>
      )}
    </svg>
  );
}
