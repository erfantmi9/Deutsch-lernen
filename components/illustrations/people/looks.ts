import { COLORS } from "../palette";
import { hashString } from "@/lib/shuffle";

/** How a dialogue character looks: a head-and-shoulders portrait drawn by Portrait. */

export const SKIN = { light: "#F9D9BC", fair: "#EFC29A", tan: "#D29A6B", brown: "#A8693F", dark: "#7A4A2C" } as const;
export const HAIR = { black: "#2B2A33", brown: "#6B3E1C", chestnut: "#9A5426", blond: "#E9B44C", red: "#C2562D", grey: "#BFC4CC" } as const;
export const SHIRT = {
  blue: COLORS.blue,
  green: COLORS.green,
  red: COLORS.red,
  yellow: COLORS.yellow,
  purple: "#8B6CEF",
  teal: "#14A3A3",
  orange: "#F28C28",
  white: "#FFFFFF",
} as const;

export type HairStyle = "short" | "side" | "curly" | "bun" | "long" | "ponytail" | "bob" | "bald";
export type Extra = "glasses" | "beard" | "moustache" | "earrings" | "headset" | "apron" | "bowtie" | "tie";

export interface Look {
  skin: string;
  hair: string;
  style: HairStyle;
  shirt: string;
  extras?: readonly Extra[];
}

/** One look per character of the dialogues, so every person keeps their face across pages. */
export const LOOKS: Readonly<Record<string, Look>> = {
  Lena: { skin: SKIN.light, hair: HAIR.blond, style: "ponytail", shirt: SHIRT.blue, extras: ["earrings"] },
  Omid: { skin: SKIN.tan, hair: HAIR.black, style: "side", shirt: SHIRT.green, extras: ["beard"] },
  Empfang: { skin: SKIN.fair, hair: HAIR.brown, style: "bun", shirt: SHIRT.teal, extras: ["headset"] },
  "Herr Fischer": { skin: SKIN.light, hair: HAIR.grey, style: "short", shirt: SHIRT.blue, extras: ["glasses", "tie"] },
  "Herr Rossi": { skin: SKIN.fair, hair: HAIR.black, style: "curly", shirt: SHIRT.red, extras: ["moustache"] },
  Mitarbeiterin: { skin: SKIN.dark, hair: HAIR.black, style: "bun", shirt: SHIRT.purple, extras: ["glasses", "earrings"] },
  Laura: { skin: SKIN.light, hair: HAIR.chestnut, style: "long", shirt: SHIRT.yellow },
  Tim: { skin: SKIN.light, hair: HAIR.red, style: "short", shirt: SHIRT.green },
  Nina: { skin: SKIN.tan, hair: HAIR.black, style: "long", shirt: SHIRT.red, extras: ["earrings"] },
  Paul: { skin: SKIN.fair, hair: HAIR.blond, style: "side", shirt: SHIRT.blue },
  Eva: { skin: SKIN.light, hair: HAIR.brown, style: "curly", shirt: SHIRT.green },
  Karim: { skin: SKIN.brown, hair: HAIR.black, style: "short", shirt: SHIRT.orange, extras: ["beard"] },
  Ben: { skin: SKIN.dark, hair: HAIR.black, style: "curly", shirt: SHIRT.blue },
  Hanna: { skin: SKIN.light, hair: HAIR.blond, style: "bob", shirt: SHIRT.purple },
  "Frau Weber": { skin: SKIN.light, hair: HAIR.grey, style: "bob", shirt: SHIRT.teal, extras: ["glasses", "earrings"] },
  "Herr Yilmaz": { skin: SKIN.tan, hair: HAIR.black, style: "side", shirt: SHIRT.blue, extras: ["moustache", "tie"] },
  Kellner: { skin: SKIN.fair, hair: HAIR.brown, style: "side", shirt: SHIRT.white, extras: ["bowtie"] },
  Mia: { skin: SKIN.fair, hair: HAIR.chestnut, style: "ponytail", shirt: SHIRT.yellow },
  "Herr Braun": { skin: SKIN.light, hair: HAIR.grey, style: "bald", shirt: SHIRT.green, extras: ["beard", "glasses"] },
  Verkäuferin: { skin: SKIN.brown, hair: HAIR.brown, style: "bun", shirt: SHIRT.red, extras: ["apron"] },
  Sara: { skin: SKIN.tan, hair: HAIR.black, style: "ponytail", shirt: SHIRT.teal, extras: ["earrings"] },
  Verkäufer: { skin: SKIN.dark, hair: HAIR.black, style: "short", shirt: SHIRT.purple, extras: ["tie"] },
  Jonas: { skin: SKIN.light, hair: HAIR.blond, style: "short", shirt: SHIRT.red },
  Passantin: { skin: SKIN.fair, hair: HAIR.red, style: "long", shirt: SHIRT.green, extras: ["glasses"] },
};

/** For texts without names (the listening conversations): speaker 0 and speaker 1. */
export const ANONYMOUS_LOOKS: readonly [Look, Look] = [
  { skin: SKIN.fair, hair: HAIR.brown, style: "bob", shirt: SHIRT.blue },
  { skin: SKIN.tan, hair: HAIR.black, style: "side", shirt: SHIRT.orange },
];

const pick = <T>(list: readonly T[], h: number): T => list[h % list.length];

/** The look of a character: from LOOKS, or built from the name so it stays the same on every visit. */
export function lookFor(name: string | undefined, index: 0 | 1): Look {
  if (!name) return ANONYMOUS_LOOKS[index];
  const known = LOOKS[name];
  if (known) return known;
  const h = hashString(name);
  return {
    skin: pick(Object.values(SKIN), h),
    hair: pick(Object.values(HAIR).filter((c) => c !== HAIR.grey), h >>> 3),
    style: pick(["short", "side", "curly", "bun", "long", "ponytail", "bob"] as const, h >>> 6),
    shirt: pick(Object.values(SHIRT).filter((c) => c !== SHIRT.white), h >>> 9),
  };
}
