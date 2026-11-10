/** A German greeting that fits the learner's local time. Pure: the hour is passed in. */

export const GREETING_KINDS = ["morning", "day", "evening", "night"] as const;
export type GreetingKind = (typeof GREETING_KINDS)[number];

/**
 * The German text is content, not UI text: it is shown (and read aloud) in every interface language.
 * "Gute Nacht" is deliberately not used: Germans say it when leaving or going to bed, not as a hello.
 */
export const GREETING_DE: Readonly<Record<GreetingKind, string>> = {
  morning: "Guten Morgen!",
  day: "Guten Tag!",
  evening: "Guten Abend!",
  night: "Noch wach?",
};

/** 5–10 morning, 11–17 day, 18–21 evening, 22–4 night. */
export function greetingKind(hour: number): GreetingKind {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 18) return "day";
  if (h >= 18 && h < 22) return "evening";
  return "night";
}
