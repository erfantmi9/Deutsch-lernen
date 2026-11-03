import { COLORS as C, INK } from "../palette";
import type { IconFC } from "./parts";

const SKIN = C.redTint;

const Kopf: IconFC = () => (
  <g>
    <circle cx={24} cy={25} r={16} fill={SKIN} />
    <path d="M8 24c0-10 6-17 16-17s16 7 16 17c-4-6-10-8-16-8s-12 2-16 8z" fill={INK} />
    <circle cx={18} cy={27} r={1.8} fill={INK} stroke="none" />
    <circle cx={30} cy={27} r={1.8} fill={INK} stroke="none" />
    <path d="M19 33q5 4 10 0" />
  </g>
);

const Hand: IconFC = () => (
  <path
    d="M14 26V12a3 3 0 0 1 6 0v10V8a3 3 0 0 1 6 0v14V10a3 3 0 0 1 6 0v14V16a3 3 0 0 1 6 0v14c0 8-5 14-13 14-6 0-9-3-12-8l-5-8a3 3 0 0 1 5-3z"
    fill={SKIN}
  />
);

const Arm: IconFC = () => (
  <g>
    <path d="M12 42v-8c0-4 3-6 6-6h4V14a6 6 0 0 1 12 0v16c0 8-6 12-14 12z" fill={SKIN} />
    <path d="M24 22h10M24 27h10" strokeWidth={1.8} />
    <path d="M4 28h10v14H4z" fill={C.blue} />
  </g>
);

const Bein: IconFC = () => (
  <g>
    <path d="M18 6h12v26H18z" fill={SKIN} />
    <path d="M18 32h12v6l9 3c2 1 2 4-1 4H17c-2 0-3-2-3-4z" fill={C.blue} />
  </g>
);

const Auge: IconFC = () => (
  <g>
    <path d="M4 24c6-9 14-12 20-12s14 3 20 12c-6 9-14 12-20 12S10 33 4 24z" fill={C.white} />
    <circle cx={24} cy={24} r={8} fill={C.blue} />
    <circle cx={24} cy={24} r={3.5} fill={INK} stroke="none" />
    <circle cx={26.5} cy={21.5} r={1.5} fill={C.white} stroke="none" />
    <path d="M24 7V4M12 11l-2-3M36 11l2-3" />
  </g>
);

const Nase: IconFC = () => (
  <g>
    <path d="M14 36c0-4 5-5 6-9V8h8v19c1 4 6 5 6 9 0 4-5 6-10 6s-10-2-10-6z" fill={SKIN} />
    <ellipse cx={19} cy={36} rx={2.2} ry={1.6} fill={INK} stroke="none" />
    <ellipse cx={29} cy={36} rx={2.2} ry={1.6} fill={INK} stroke="none" />
  </g>
);

const Fuss: IconFC = () => (
  <g>
    <path d="M20 14c-6 0-9 6-8 14 1 8 3 11 3 15 0 3 3 4 6 4s5-2 5-5c0-5 3-8 3-14 0-10-4-14-9-14z" fill={SKIN} />
    <circle cx={14} cy={9} r={3} fill={SKIN} />
    <circle cx={21} cy={6} r={3} fill={SKIN} />
    <circle cx={28} cy={7} r={2.6} fill={SKIN} />
    <circle cx={33} cy={12} r={2.2} fill={SKIN} />
  </g>
);

const Ohr: IconFC = () => (
  <g>
    <path d="M24 6c-8 0-12 6-12 12 0 5 3 7 5 10 2 4 2 10 8 10 5 0 7-4 7-8 0-4 4-6 4-14 0-6-5-10-12-10z" fill={SKIN} />
    <path d="M20 18c0-4 6-6 8 0 1 3-2 5-3 8" />
  </g>
);

export const BODY_ICONS = {
  kopf: Kopf,
  hand: Hand,
  arm: Arm,
  bein: Bein,
  auge: Auge,
  nase: Nase,
  fuss: Fuss,
  ohr: Ohr,
} satisfies Record<string, IconFC>;
