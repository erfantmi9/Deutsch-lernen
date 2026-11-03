import type { VocabCategory } from "@/types/vocab";
import { getIconKey } from "@/lib/icons";
import { COLORS } from "./palette";
import { Svg } from "./Svg";
import type { IllustrationProps } from "./Svg";
import { NOUN_ICON_REGISTRY } from "./noun/registry";

const CATEGORY_TINT: Record<VocabCategory, string> = {
  food: COLORS.yellowTint,
  family: COLORS.redTint,
  home: COLORS.greenTint,
  travel: COLORS.blueTint,
  time: COLORS.yellowTint,
  school: COLORS.blueTint,
  body: COLORS.redTint,
  shopping: COLORS.yellowTint,
  jobs: COLORS.blueTint,
  weather: COLORS.blueTint,
  colors: COLORS.redTint,
  clothes: COLORS.greenTint,
  city: COLORS.greenTint,
  hobbies: COLORS.redTint,
  "numbers-time": COLORS.yellowTint,
};

export type NounIconProps = IllustrationProps & {
  /** Vocab id, e.g. "apfel". */
  id: string;
  /** Used for the neutral fallback icon and the soft background tint. */
  category?: VocabCategory;
};

/** Flat icon for a vocab noun, with a category-icon fallback. Renders nothing if neither exists. */
export default function NounIcon({ id, category, size = 96, className, title }: NounIconProps) {
  const key = getIconKey(id, category);
  if (!key) return null;
  const Icon = NOUN_ICON_REGISTRY[key];
  return (
    <Svg viewBox="-4 -4 56 56" size={size} className={className} title={title}>
      <circle cx={24} cy={24} r={28} fill={category ? CATEGORY_TINT[category] : COLORS.blueTint} stroke="none" />
      <g transform="translate(24 24) scale(.82) translate(-24 -24)">
        <Icon />
      </g>
    </Svg>
  );
}
