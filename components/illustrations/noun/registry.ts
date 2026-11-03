import type { IconKey } from "@/lib/icons";
import type { IconFC } from "./parts";
import { FOOD_ICONS } from "./food";
import { FAMILY_ICONS } from "./family";
import { BODY_ICONS } from "./body";
import { HOME_ICONS } from "./home";
import { TRAVEL_ICONS } from "./travel";
import { SCHOOL_ICONS } from "./school";
import { TIME_ICONS } from "./time";
import { CATEGORY_ICONS } from "./categories";

/** Typed against IconKey, so a key added to lib/icons.ts without a drawing fails to compile. */
export const NOUN_ICON_REGISTRY: Record<IconKey, IconFC> = {
  ...FOOD_ICONS,
  ...FAMILY_ICONS,
  ...BODY_ICONS,
  ...HOME_ICONS,
  ...TRAVEL_ICONS,
  ...SCHOOL_ICONS,
  ...TIME_ICONS,
  ...CATEGORY_ICONS,
};
