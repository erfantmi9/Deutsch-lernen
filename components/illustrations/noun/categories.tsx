import { COLORS as C, INK } from "../palette";
import { Person } from "./parts";
import type { IconFC } from "./parts";

/** Neutral fallbacks, one per vocab category, for words without a dedicated icon. */
const Food: IconFC = () => (
  <g>
    <path d="M17 18c-2-3 2-4 0-8M25 18c-2-3 2-4 0-8M33 18c-2-3 2-4 0-8" />
    <path d="M6 22h36c0 10-8 18-18 18S6 32 6 22z" fill={C.red} />
    <path d="M5 22h38" />
  </g>
);

const Family: IconFC = () => (
  <g>
    <g transform="translate(-9 8) scale(.7)">
      <Person shirt={C.blue} />
    </g>
    <g transform="translate(11 8) scale(.7)">
      <Person hair="bun" hairColor={C.yellow} shirt={C.red} />
    </g>
    <path d="M24 17c-8-5-8-11-3-11 2 0 3 1 3 3 0-2 1-3 3-3 5 0 5 6-3 11z" fill={C.red} />
  </g>
);

const Home: IconFC = () => (
  <g>
    <rect x={10} y={14} width={28} height={16} rx={6} fill={C.blue} />
    <rect x={5} y={24} width={38} height={12} rx={5} fill={C.blueTint} />
    <path d="M12 36v5M36 36v5" />
  </g>
);

const Travel: IconFC = () => (
  <g>
    <path d="M24 44c-9-10-13-17-13-23a13 13 0 0 1 26 0c0 6-4 13-13 23z" fill={C.red} />
    <circle cx={24} cy={21} r={5} fill={C.white} />
  </g>
);

const Time: IconFC = () => (
  <g>
    <path d="M12 5h24M12 43h24" />
    <path d="M14 5h20c0 10-10 12-10 19s10 9 10 19H14c0-10 10-12 10-19S14 15 14 5z" fill={C.yellowTint} />
    <path d="M17 43c0-5 5-8 7-10 2 2 7 5 7 10z" fill={C.yellow} />
  </g>
);

const School: IconFC = () => (
  <g>
    <path d="M10 38 8 44l6-2 26-26-4-4z" fill={C.yellow} />
    <path d="M10 38l4 4M32 12l4 4" />
    <path d="M8 44l2-6 4 4z" fill={C.redTint} />
  </g>
);

const Body: IconFC = () => (
  <path d="M24 41C8 30 8 14 18 12c4-1 6 2 6 4 0-2 2-5 6-4 10 2 10 18-6 29z" fill={C.red} />
);

const Shopping: IconFC = () => (
  <g>
    <path d="M10 18h28l-3 24H13z" fill={C.yellow} />
    <path d="M17 18v-4a7 7 0 0 1 14 0v4" />
  </g>
);

const Jobs: IconFC = () => (
  <g>
    <rect x={6} y={15} width={36} height={25} rx={4} fill={C.blue} />
    <path d="M17 15v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M6 27h36" />
    <rect x={21} y={24} width={6} height={7} rx={1.5} fill={C.yellow} />
  </g>
);

const Weather: IconFC = () => (
  <g>
    <circle cx={18} cy={18} r={7} fill={C.yellow} />
    <path d="M18 5v3M6 18h3M9 9l2 2M27 9l-2 2" />
    <path d="M16 38a7 7 0 0 1 1-14 9 9 0 0 1 17 2 6 6 0 0 1 0 12z" fill={C.white} />
  </g>
);

const Colors: IconFC = () => (
  <g>
    <path d="M24 6C12 6 5 14 5 24c0 9 7 16 15 16 4 0 4-3 2-5-2-3 0-6 4-6h6c5 0 9-2 9-7C41 12 34 6 24 6z" fill={C.yellowTint} />
    <circle cx={15} cy={22} r={3} fill={C.red} />
    <circle cx={23} cy={14} r={3} fill={C.blue} />
    <circle cx={33} cy={17} r={3} fill={C.green} />
  </g>
);

const Clothes: IconFC = () => (
  <g>
    <path d="M17 7 6 14l5 8 5-3v21h16V19l5 3 5-8-11-7c-1 4-4 6-7 6s-6-2-7-6z" fill={C.green} />
  </g>
);

const City: IconFC = () => (
  <g>
    <rect x={6} y={18} width={14} height={24} fill={C.blue} />
    <rect x={20} y={8} width={14} height={34} fill={C.blueTint} />
    <rect x={34} y={22} width={9} height={20} fill={C.yellow} />
    <path d="M4 42h40M11 24h3M11 31h3M26 15h3M26 22h3M26 29h3" />
  </g>
);

const Hobbies: IconFC = () => (
  <g>
    <circle cx={24} cy={24} r={17} fill={C.white} />
    <path d="m24 16 7 5-3 8h-8l-3-8z" fill={INK} />
    <path d="M24 16V7M31 21l9-3M28 29l5 8M20 29l-5 8M17 21 8 18" />
  </g>
);

const NumbersTime: IconFC = () => (
  <g>
    <circle cx={24} cy={25} r={17} fill={C.yellowTint} />
    <path d="M24 14v11l7 4M19 5h10" />
  </g>
);

const Health: IconFC = () => (
  <g>
    <rect x={8} y={8} width={32} height={32} rx={8} fill={C.white} />
    <path d="M20 14h8v6h6v8h-6v6h-8v-6h-6v-8h6z" fill={C.red} />
  </g>
);

const Animals: IconFC = () => (
  <g>
    <ellipse cx={24} cy={32} rx={9} ry={8} fill={C.yellow} />
    <circle cx={12} cy={20} r={4} fill={C.yellow} />
    <circle cx={20} cy={12} r={4} fill={C.yellow} />
    <circle cx={28} cy={12} r={4} fill={C.yellow} />
    <circle cx={36} cy={20} r={4} fill={C.yellow} />
  </g>
);

const Services: IconFC = () => (
  <g>
    <rect x={5} y={12} width={38} height={26} rx={4} fill={C.white} />
    <path d="m5 14 19 13 19-13" />
    <rect x={32} y={16} width={7} height={8} rx={1} fill={C.blue} />
  </g>
);

const Celebrations: IconFC = () => (
  <g>
    <ellipse cx={24} cy={17} rx={11} ry={13} fill={C.red} />
    <path d="m22 30 2 3 2-3z" fill={C.red} />
    <path d="M24 33c-3 4 3 6 0 11" />
    <path d="M18 11c1-2 3-3 5-3" stroke={C.white} strokeWidth={2.5} />
  </g>
);

export const CATEGORY_ICONS = {
  "cat-food": Food,
  "cat-family": Family,
  "cat-home": Home,
  "cat-travel": Travel,
  "cat-time": Time,
  "cat-school": School,
  "cat-body": Body,
  "cat-shopping": Shopping,
  "cat-jobs": Jobs,
  "cat-weather": Weather,
  "cat-colors": Colors,
  "cat-clothes": Clothes,
  "cat-city": City,
  "cat-hobbies": Hobbies,
  "cat-numbers-time": NumbersTime,
  "cat-health": Health,
  "cat-animals": Animals,
  "cat-services": Services,
  "cat-celebrations": Celebrations,
} satisfies Record<string, IconFC>;
