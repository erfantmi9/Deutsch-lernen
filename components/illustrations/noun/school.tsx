import { COLORS as C } from "../palette";
import { Person } from "./parts";
import type { IconFC } from "./parts";

const Zeitung: IconFC = () => (
  <g>
    <path d="M36 15h5a1 1 0 0 1 1 1v22a4 4 0 0 1-4 4H12" fill={C.blueTint} />
    <rect x={7} y={7} width={29} height={35} rx={3} fill={C.white} />
    <rect x={11} y={11} width={21} height={8} rx={1.5} fill={C.blue} />
    <path d="M11 25h21M11 30h21M11 35h13" />
  </g>
);

const Universitaet: IconFC = () => (
  <g>
    <path d="M4 18 24 6l20 12z" fill={C.red} />
    <rect x={9} y={20} width={5} height={16} fill={C.white} />
    <rect x={17} y={20} width={5} height={16} fill={C.white} />
    <rect x={26} y={20} width={5} height={16} fill={C.white} />
    <rect x={34} y={20} width={5} height={16} fill={C.white} />
    <rect x={5} y={36} width={38} height={6} rx={2} fill={C.yellow} />
  </g>
);

function Board() {
  return (
    <g>
      <rect x={27} y={8} width={17} height={14} rx={2} fill={C.greenTint} />
      <path d="M31 13h9M31 18h6" strokeWidth={2} />
    </g>
  );
}

const Lehrerin: IconFC = () => (
  <g>
    <Board />
    <g transform="translate(-5 2) scale(.9)">
      <Person hair="bun" hairColor={C.yellow} shirt={C.red} glasses />
    </g>
  </g>
);

const Lehrer: IconFC = () => (
  <g>
    <Board />
    <g transform="translate(-5 2) scale(.9)">
      <Person shirt={C.blue} glasses />
    </g>
  </g>
);

const Schueler: IconFC = () => (
  <g>
    <rect x={29} y={26} width={11} height={17} rx={4} fill={C.yellow} />
    <g transform="translate(-3 0)">
      <Person hair="spiky" shirt={C.green} scale={0.9} />
    </g>
  </g>
);

const Schule: IconFC = () => (
  <g>
    <path d="M24 6V1" />
    <path d="M24 1h7v4h-7z" fill={C.blue} />
    <rect x={6} y={18} width={36} height={24} fill={C.yellow} />
    <path d="M3 18 24 6l21 12z" fill={C.red} />
    <rect x={20} y={30} width={8} height={12} fill={C.blue} />
    <rect x={10} y={24} width={6} height={6} fill={C.white} />
    <rect x={32} y={24} width={6} height={6} fill={C.white} />
  </g>
);

const Buch: IconFC = () => (
  <g>
    <rect x={10} y={5} width={28} height={37} rx={3} fill={C.blue} />
    <path d="M16 5v37" />
    <rect x={20} y={11} width={14} height={8} rx={2} fill={C.white} />
    <path d="M20 26h14M20 31h9" stroke={C.white} />
  </g>
);

const Heft: IconFC = () => (
  <g>
    <rect x={10} y={5} width={28} height={37} rx={3} fill={C.greenTint} />
    <path d="M17 15h16M17 22h16M17 29h10" />
    <circle cx={10} cy={11} r={2.4} fill={C.white} />
    <circle cx={10} cy={20} r={2.4} fill={C.white} />
    <circle cx={10} cy={29} r={2.4} fill={C.white} />
    <circle cx={10} cy={38} r={2.4} fill={C.white} />
  </g>
);

export const SCHOOL_ICONS = {
  zeitung: Zeitung,
  universitaet: Universitaet,
  lehrerin: Lehrerin,
  schule: Schule,
  lehrer: Lehrer,
  schueler: Schueler,
  buch: Buch,
  heft: Heft,
} satisfies Record<string, IconFC>;
