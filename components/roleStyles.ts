import type { SentenceRole } from "@/types/sentence";

/**
 * Colours for sentence parts, as semantic role tokens (see globals.css).
 * Full static class strings so Tailwind's JIT can see them.
 * Colour is never the only signal: every coloured chip also shows a text label.
 */
export const ROLE_STYLE: Record<SentenceRole, string> = {
  verb: "border-role-verb-edge bg-role-verb text-text",
  subject: "border-role-subject-edge bg-role-subject text-text",
  time: "border-role-time-edge bg-role-time text-text",
  manner: "border-role-manner-edge bg-role-manner text-text",
  place: "border-role-place-edge bg-role-place text-text",
  negation: "border-role-negation-edge bg-role-negation text-text",
  object: "border-role-object-edge bg-role-object text-text",
  question: "border-role-question-edge bg-role-question text-text",
  connector: "border-role-connector-edge bg-role-connector text-text",
  other: "border-role-other-edge bg-role-other text-text",
};

export const ROLE_SWATCH: Record<SentenceRole, string> = {
  verb: "bg-role-verb-edge",
  subject: "bg-role-subject-edge",
  time: "bg-role-time-edge",
  manner: "bg-role-manner-edge",
  place: "bg-role-place-edge",
  negation: "bg-role-negation-edge",
  object: "bg-role-object-edge",
  question: "bg-role-question-edge",
  connector: "bg-role-connector-edge",
  other: "bg-role-other-edge",
};
