import { COLORS as C } from "../palette";
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

export const CATEGORY_ICONS = {
  "cat-food": Food,
  "cat-family": Family,
  "cat-home": Home,
  "cat-travel": Travel,
  "cat-time": Time,
  "cat-school": School,
  "cat-body": Body,
} satisfies Record<string, IconFC>;
