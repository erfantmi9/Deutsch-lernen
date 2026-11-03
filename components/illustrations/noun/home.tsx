import { COLORS as C, INK } from "../palette";
import type { IconFC } from "./parts";

const Haus: IconFC = () => (
  <g>
    <path d="M33 16V9h4v10" fill={C.red} />
    <rect x={10} y={22} width={28} height={20} fill={C.yellowTint} />
    <path d="M5 24 24 8l19 16z" fill={C.red} />
    <rect x={20} y={30} width={8} height={12} fill={C.blue} />
    <rect x={13} y={28} width={5} height={5} fill={C.white} />
  </g>
);

const Zimmer: IconFC = () => (
  <g>
    <rect x={6} y={8} width={36} height={30} rx={3} fill={C.blueTint} />
    <rect x={6} y={34} width={36} height={8} rx={2} fill={C.yellow} />
    <rect x={11} y={14} width={14} height={14} rx={2} fill={C.white} />
    <path d="M18 14v14M11 21h14" />
    <rect x={29} y={24} width={13} height={10} rx={3} fill={C.red} />
  </g>
);

const Kueche: IconFC = () => (
  <g>
    <path d="M18 18c-2-3 2-4 0-8M26 18c-2-3 2-4 0-8M34 18c-2-3 2-4 0-8" />
    <path d="M10 24h28v12a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" fill={C.blue} />
    <path d="M7 24h34M6 29h4M38 29h4" />
  </g>
);

const Wohnung: IconFC = () => (
  <g>
    <rect x={12} y={5} width={24} height={37} rx={2} fill={C.greenTint} />
    <rect x={16} y={10} width={6} height={6} fill={C.white} />
    <rect x={26} y={10} width={6} height={6} fill={C.yellow} />
    <rect x={16} y={20} width={6} height={6} fill={C.yellow} />
    <rect x={26} y={20} width={6} height={6} fill={C.white} />
    <rect x={20} y={32} width={8} height={10} fill={C.blue} />
  </g>
);

const Tuer: IconFC = () => (
  <g>
    <rect x={11} y={5} width={26} height={37} rx={3} fill={C.yellow} />
    <rect x={16} y={10} width={16} height={11} rx={2} strokeWidth={1.8} />
    <rect x={16} y={26} width={16} height={11} rx={2} strokeWidth={1.8} />
    <circle cx={32} cy={24} r={1.8} fill={INK} />
  </g>
);

const Fenster: IconFC = () => (
  <g>
    <rect x={8} y={7} width={32} height={32} rx={4} fill={C.blueTint} />
    <path d="M24 7v32M8 23h32" />
    <path d="M5 42h38" strokeWidth={4} />
    <path d="M13 13l4-0M13 29h4" stroke={C.white} />
  </g>
);

const Tisch: IconFC = () => (
  <g>
    <rect x={20} y={7} width={8} height={11} rx={2} fill={C.red} />
    <rect x={5} y={18} width={38} height={6} rx={2} fill={C.yellow} />
    <path d="M10 24v18M38 24v18" />
  </g>
);

const Lampe: IconFC = () => (
  <g>
    <path d="M24 26v14M15 42h18" />
    <path d="M15 6h18l7 20H8z" fill={C.yellow} />
  </g>
);

const Stuhl: IconFC = () => (
  <g>
    <rect x={12} y={5} width={6} height={20} rx={2} fill={C.red} />
    <rect x={12} y={24} width={26} height={7} rx={2} fill={C.red} />
    <path d="M15 31v11M35 31v11" />
  </g>
);

const Bett: IconFC = () => (
  <g>
    <rect x={5} y={14} width={5} height={28} rx={2} fill={C.yellow} />
    <rect x={38} y={26} width={5} height={16} rx={2} fill={C.yellow} />
    <rect x={10} y={28} width={28} height={9} fill={C.blue} />
    <rect x={12} y={21} width={11} height={7} rx={3} fill={C.white} />
  </g>
);

export const HOME_ICONS = {
  haus: Haus,
  zimmer: Zimmer,
  kueche: Kueche,
  wohnung: Wohnung,
  tuer: Tuer,
  fenster: Fenster,
  tisch: Tisch,
  lampe: Lampe,
  stuhl: Stuhl,
  bett: Bett,
} satisfies Record<string, IconFC>;
