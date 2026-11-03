import { COLORS as C, INK } from "../palette";
import type { IconFC } from "./parts";

const Auto: IconFC = () => (
  <g>
    <path d="M5 36v-9c0-2 1-4 3-4l4-1 5-8c1-2 3-3 5-3h9c2 0 4 1 5 3l3 8c3 1 4 3 4 5v9z" fill={C.red} />
    <path d="M17 22l3-7h9l3 7z" fill={C.blueTint} />
    <circle cx={14} cy={36} r={5} fill={INK} />
    <circle cx={35} cy={36} r={5} fill={INK} />
    <circle cx={14} cy={36} r={1.8} fill={C.white} stroke="none" />
    <circle cx={35} cy={36} r={1.8} fill={C.white} stroke="none" />
  </g>
);

const Zug: IconFC = () => (
  <g>
    <rect x={10} y={6} width={28} height={32} rx={7} fill={C.blue} />
    <rect x={14} y={11} width={20} height={11} rx={3} fill={C.blueTint} />
    <circle cx={17} cy={30} r={2.6} fill={C.yellow} />
    <circle cx={31} cy={30} r={2.6} fill={C.yellow} />
    <path d="M7 43h34M15 38l-4 5M33 38l4 5" />
  </g>
);

const Bus: IconFC = () => (
  <g>
    <rect x={4} y={10} width={40} height={26} rx={5} fill={C.yellow} />
    <rect x={8} y={15} width={8} height={8} rx={1.5} fill={C.blueTint} />
    <rect x={20} y={15} width={8} height={8} rx={1.5} fill={C.blueTint} />
    <rect x={32} y={15} width={8} height={8} rx={1.5} fill={C.blueTint} />
    <path d="M4 29h40" />
    <circle cx={14} cy={37} r={4.5} fill={INK} />
    <circle cx={34} cy={37} r={4.5} fill={INK} />
  </g>
);

const Bahnhof: IconFC = () => (
  <g>
    <rect x={6} y={20} width={36} height={22} fill={C.redTint} />
    <path d="M3 20 24 7l21 13z" fill={C.red} />
    <StationClock />
    <rect x={20} y={30} width={8} height={12} fill={C.blue} />
    <rect x={10} y={26} width={6} height={6} fill={C.white} />
    <rect x={32} y={26} width={6} height={6} fill={C.white} />
  </g>
);

function StationClock() {
  return (
    <g>
      <circle cx={24} cy={17} r={4.5} fill={C.white} />
      <path d="M24 14.5V17h2" strokeWidth={1.6} />
    </g>
  );
}

const Flughafen: IconFC = () => (
  <path
    d="M24 4c2 0 3 2 3 5v9l15 9v4l-15-4v9l4 3v3l-7-2-7 2v-3l4-3v-9L6 31v-4l15-9V9c0-3 1-5 3-5z"
    fill={C.blue}
  />
);

const Reise: IconFC = () => (
  <g>
    <path d="M18 16v-5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5" />
    <rect x={7} y={16} width={34} height={24} rx={5} fill={C.red} />
    <path d="M16 16v24M32 16v24" />
    <rect x={20} y={24} width={8} height={7} rx={2} fill={C.yellow} />
  </g>
);

const Fahrkarte: IconFC = () => (
  <g>
    <path d="M5 13h38v7a4 4 0 0 0 0 8v7H5v-7a4 4 0 0 0 0-8z" fill={C.yellow} />
    <path d="M31 14v20" strokeDasharray="2 3" strokeWidth={2} />
    <path d="M11 21h14M11 27h9" />
  </g>
);

const Stadt: IconFC = () => (
  <g>
    <circle cx={38} cy={10} r={4.5} fill={C.yellow} />
    <rect x={5} y={22} width={11} height={20} fill={C.blueTint} />
    <rect x={16} y={11} width={13} height={31} fill={C.red} />
    <rect x={29} y={19} width={11} height={23} fill={C.greenTint} />
    <path d="M20 17h5M20 24h5M20 31h5M9 28h3M9 34h3M33 25h3M33 31h3" strokeWidth={2} />
    <path d="M3 42h42" />
  </g>
);

const Hund: IconFC = () => (
  <g>
    <path d="M14 14c-6 0-8 8-6 14 3 0 6-3 6-8z" fill={C.yellow} />
    <path d="M34 14c6 0 8 8 6 14-3 0-6-3-6-8z" fill={C.yellow} />
    <path d="M14 18c0-7 5-10 10-10s10 3 10 10v8c0 8-5 12-10 12s-10-4-10-12z" fill={C.yellowTint} />
    <ellipse cx={24} cy={30} rx={7} ry={5.5} fill={C.white} />
    <ellipse cx={24} cy={27} rx={3} ry={2} fill={INK} />
    <circle cx={19} cy={20} r={1.6} fill={INK} stroke="none" />
    <circle cx={29} cy={20} r={1.6} fill={INK} stroke="none" />
    <path d="M24 29v3M20.5 33q3.5 3 7 0" strokeWidth={2} />
  </g>
);

const Katze: IconFC = () => (
  <g>
    <path d="M11 20 10 6l10 6zM37 20l1-14-10 6z" fill={C.yellow} />
    <path d="M10 22c0-8 6-12 14-12s14 4 14 12c0 8-6 14-14 14S10 30 10 22z" fill={C.yellow} />
    <ellipse cx={18} cy={21} rx={1.8} ry={2.4} fill={INK} stroke="none" />
    <ellipse cx={30} cy={21} rx={1.8} ry={2.4} fill={INK} stroke="none" />
    <path d="M22 25h4l-2 2.5z" fill={C.red} strokeWidth={1.6} />
    <path d="M24 27.5q-2 3-5 2M24 27.5q2 3 5 2M6 24l9 1M6 30l9-2M42 24l-9 1M42 30l-9-2" strokeWidth={1.8} />
  </g>
);

export const TRAVEL_ICONS = {
  auto: Auto,
  zug: Zug,
  bus: Bus,
  bahnhof: Bahnhof,
  flughafen: Flughafen,
  reise: Reise,
  fahrkarte: Fahrkarte,
  stadt: Stadt,
  hund: Hund,
  katze: Katze,
} satisfies Record<string, IconFC>;
