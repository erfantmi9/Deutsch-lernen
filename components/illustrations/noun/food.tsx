import { COLORS as C } from "../palette";
import type { IconFC } from "./parts";

const Apfel: IconFC = () => (
  <g>
    <path d="M24 16c-5-5-15-2-15 9 0 9 6 18 11 18 2 0 3-1 4-1s2 1 4 1c5 0 11-9 11-18 0-11-10-14-15-9z" fill={C.red} />
    <path d="M24 16c0-4 1-7 3-9" />
    <path d="M27 10c3-3 8-3 10-1-2 3-7 4-10 1z" fill={C.green} />
    <path d="M15 25c0-3 2-5 4-5" stroke={C.white} />
  </g>
);

const Brot: IconFC = () => (
  <g>
    <path d="M6 32c0-8 8-14 18-14s18 6 18 14v4c0 2-1 3-3 3H9c-2 0-3-1-3-3z" fill={C.yellow} />
    <path d="M17 23l-3 7M25 21l-3 8M33 23l-3 7" />
  </g>
);

const Broetchen: IconFC = () => (
  <g>
    <ellipse cx={24} cy={28} rx={17} ry={12} fill={C.yellow} />
    <path d="M16 25c4-4 12-4 16 0M19 32c3 2 7 2 10 0" />
  </g>
);

const Banane: IconFC = () => (
  <g>
    <path d="M12 10c-1 14 7 28 24 29 4 0 6-2 5-5-12 0-18-8-18-24z" fill={C.yellow} />
    <path d="M12 10l-1-4h5l-1 4z" fill={C.green} />
  </g>
);

const Tomate: IconFC = () => (
  <g>
    <circle cx={24} cy={28} r={15} fill={C.red} />
    <path d="M16 17c3 1 5 3 8 3s5-2 8-3c-1 4-4 6-8 6s-7-2-8-6z" fill={C.green} />
    <path d="M24 20v-6" />
  </g>
);

const Kaese: IconFC = () => (
  <g>
    <path d="M5 34V24L43 12v22a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" fill={C.yellow} />
    <circle cx={14} cy={31} r={3} fill={C.yellowTint} />
    <circle cx={28} cy={26} r={3.5} fill={C.yellowTint} />
    <circle cx={36} cy={31} r={2} fill={C.yellowTint} />
  </g>
);

const Milch: IconFC = () => (
  <g>
    <path d="M14 16h20v26H14z" fill={C.white} />
    <path d="M14 16l5-8h10l5 8z" fill={C.blue} />
    <path d="M24 24c-3 4-4 6-4 8a4 4 0 0 0 8 0c0-2-1-4-4-8z" fill={C.blue} />
  </g>
);

const Wasser: IconFC = () => (
  <g>
    <path d="M12 8h24l-3 34H15z" fill={C.white} />
    <path d="M13.5 22h21l-1.5 20H15z" fill={C.blueTint} />
    <circle cx={21} cy={32} r={1.6} fill={C.white} />
    <circle cx={27} cy={28} r={1.2} fill={C.white} />
  </g>
);

const Getraenk: IconFC = () => (
  <g>
    <path d="M28 20l4-12h7" />
    <path d="M13 18h22l-2 24H15z" fill={C.yellowTint} />
    <path d="M14 26h20l-1 16H15z" fill={C.yellow} />
    <circle cx={35} cy={18} r={5} fill={C.green} />
  </g>
);

const Essen: IconFC = () => (
  <g>
    <circle cx={24} cy={26} r={11} fill={C.white} />
    <circle cx={24} cy={26} r={6} fill={C.yellowTint} />
    <path d="M6 8v9a3 3 0 0 0 6 0V8M9 8v32" />
    <path d="M42 8c-3 4-4 9-4 14h4zM42 22v18" />
  </g>
);

export const FOOD_ICONS = {
  apfel: Apfel,
  brot: Brot,
  broetchen: Broetchen,
  banane: Banane,
  tomate: Tomate,
  kaese: Kaese,
  milch: Milch,
  wasser: Wasser,
  getraenk: Getraenk,
  essen: Essen,
} satisfies Record<string, IconFC>;
