import type { ComponentType } from "react";
import type { BadgeKey } from "@/lib/badges";
import {
  BadgeDaily,
  BadgeDialogue5,
  BadgeFirstCorrect,
  BadgeGrammar3,
  BadgeMature25,
  BadgeReading5,
  BadgeReview50,
  BadgeSentences10,
  BadgeStreak10,
  BadgeStreak5,
  BadgeStreak7,
  BadgeVerbs10,
} from "./index";
import type { BadgeProps } from "./index";

/** Typed against BadgeKey: a badge rule without a drawing fails to compile. */
export const BADGE_ART: Record<BadgeKey, ComponentType<BadgeProps>> = {
  firstCorrect: BadgeFirstCorrect,
  streak5: BadgeStreak5,
  streak10: BadgeStreak10,
  verbs10: BadgeVerbs10,
  sentences10: BadgeSentences10,
  daily: BadgeDaily,
  grammar3: BadgeGrammar3,
  dialogue5: BadgeDialogue5,
  reading5: BadgeReading5,
  review50: BadgeReview50,
  streak7: BadgeStreak7,
  mature25: BadgeMature25,
};
