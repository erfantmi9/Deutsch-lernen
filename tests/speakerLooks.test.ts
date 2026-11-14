import { describe, expect, it } from "vitest";
import { dialogues } from "@/lib/dialogues";
import { speakersOf } from "@/lib/rolePlay";
import { ANONYMOUS_LOOKS, LOOKS, lookFor } from "@/components/illustrations/people/looks";

describe("dialogue avatars", () => {
  it("every dialogue character has a designed look", () => {
    const missing = dialogues.flatMap((d) => speakersOf(d.lines)).filter((name) => !(name in LOOKS));
    expect(missing, "add these speakers to LOOKS in components/illustrations/people/looks.ts").toEqual([]);
  });

  it("the two speakers of a dialogue never look alike", () => {
    for (const d of dialogues) {
      const [a, b] = speakersOf(d.lines).map((name, i) => lookFor(name, i as 0 | 1));
      expect(JSON.stringify(a), d.id).not.toBe(JSON.stringify(b));
    }
    expect(ANONYMOUS_LOOKS[0]).not.toEqual(ANONYMOUS_LOOKS[1]);
  });

  it("unknown names get a stable look, and texts without names one look per side", () => {
    expect(lookFor("Zoe", 0)).toEqual(lookFor("Zoe", 1));
    expect(lookFor(undefined, 1)).toBe(ANONYMOUS_LOOKS[1]);
  });
});
