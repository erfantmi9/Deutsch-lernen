import { COLORS as C } from "../palette";
import { Calendar, Clock } from "./parts";
import type { IconFC } from "./parts";

const Montag: IconFC = () => <Calendar col={0} row={0} color={C.blue} />;
const Dienstag: IconFC = () => <Calendar col={1} row={0} color={C.red} />;
const Woche: IconFC = () => <Calendar markRow={0} color={C.green} />;

const Sommer: IconFC = () => (
  <g>
    <circle cx={24} cy={24} r={9} fill={C.yellow} />
    <path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5 37 37M11 37l3.5-3.5M33.5 14.5 37 11" />
  </g>
);

const Winter: IconFC = () => (
  <g>
    <circle cx={24} cy={24} r={20} fill={C.blueTint} stroke="none" />
    <path d="M24 7v34M9.3 15.5l29.4 17M9.3 32.5l29.4-17" />
    <path d="M20 10l4 3 4-3M20 38l4-3 4 3" />
    <circle cx={24} cy={24} r={3.5} fill={C.white} />
  </g>
);

const Stunde: IconFC = () => <Clock wedge hour={3} />;

const Jahr: IconFC = () => (
  <g>
    <path d="M24 24V7a17 17 0 0 1 17 17z" fill={C.yellow} />
    <path d="M24 24h17a17 17 0 0 1-17 17z" fill={C.red} />
    <path d="M24 24v17A17 17 0 0 1 7 24z" fill={C.blueTint} />
    <path d="M24 24H7A17 17 0 0 1 24 7z" fill={C.green} />
    <circle cx={24} cy={24} r={4} fill={C.white} />
  </g>
);

const Uhr: IconFC = () => (
  <g>
    <circle cx={12} cy={10} r={6} fill={C.red} />
    <circle cx={36} cy={10} r={6} fill={C.red} />
    <Clock cy={26} r={16} hour={10} minute={10} />
    <path d="M14 41l-3 4M34 41l3 4" />
  </g>
);

export const TIME_ICONS = {
  montag: Montag,
  dienstag: Dienstag,
  sommer: Sommer,
  winter: Winter,
  woche: Woche,
  stunde: Stunde,
  jahr: Jahr,
  uhr: Uhr,
} satisfies Record<string, IconFC>;
