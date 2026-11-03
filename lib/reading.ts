import a1 from "../data/reading/a1.json";
import a1b from "../data/reading/a1-b.json";
import { ReadingListSchema } from "./schemas/reading";
import type { ReadingText } from "../types/reading";

// Validated once at module load; throws a ZodError on malformed data.
export const readingTexts: readonly ReadingText[] = ReadingListSchema.parse([...a1, ...a1b]);

const byId: ReadonlyMap<string, ReadingText> = new Map(readingTexts.map((t) => [t.id, t]));

export function getReadingText(id: string): ReadingText | undefined {
  return byId.get(id);
}

export function getReadingNeighbours(id: string): { prev: ReadingText | null; next: ReadingText | null } {
  const i = readingTexts.findIndex((t) => t.id === id);
  if (i === -1) return { prev: null, next: null };
  return { prev: readingTexts[i - 1] ?? null, next: readingTexts[i + 1] ?? null };
}
