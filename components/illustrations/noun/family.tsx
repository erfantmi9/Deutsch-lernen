import { COLORS as C } from "../palette";
import { Person } from "./parts";
import type { IconFC } from "./parts";

const Mann: IconFC = () => <Person shirt={C.blue} />;
const Frau: IconFC = () => <Person hair="long" hairColor={C.yellow} shirt={C.red} />;
const Maedchen: IconFC = () => <Person hair="pigtails" hairColor={C.yellow} shirt={C.red} scale={0.85} />;
const Junge: IconFC = () => <Person hair="spiky" shirt={C.green} scale={0.85} />;
const Kind: IconFC = () => <Person hair="none" shirt={C.yellow} scale={0.75} />;
const Vater: IconFC = () => <Person glasses shirt={C.green} />;
const Mutter: IconFC = () => <Person hair="bun" hairColor={C.yellow} shirt={C.blue} />;
const Bruder: IconFC = () => <Person hair="spiky" hairColor={C.yellow} shirt={C.blue} scale={0.9} />;

export const FAMILY_ICONS = {
  mann: Mann,
  frau: Frau,
  maedchen: Maedchen,
  junge: Junge,
  kind: Kind,
  vater: Vater,
  mutter: Mutter,
  bruder: Bruder,
} satisfies Record<string, IconFC>;
