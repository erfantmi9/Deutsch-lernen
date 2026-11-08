/** Shared illustration palette. Flat fills only, navy outline, no gradients. */
export const INK = "#1f2937";

export const COLORS = {
  blue: "#1a73e8",
  yellow: "#fbbc04",
  green: "#34a853",
  red: "#ea4335",
  blueTint: "#dbe8fc",
  yellowTint: "#fff4cc",
  greenTint: "#d8f0de",
  redTint: "#fde0dd",
  white: "#ffffff",
  /** Mascot (Dackel) coat, ear and muzzle. */
  brown: "#A0612B",
  brownDark: "#6B3E1C",
  tan: "#D9A066",
} as const;

/** `surface` / `surface-2` follow the active theme via CSS variables. */
export type Tone = keyof typeof COLORS | "surface" | "surface-2";

export function toneColor(tone: Tone): string {
  return tone === "surface" || tone === "surface-2" ? `rgb(var(--${tone}))` : COLORS[tone];
}
