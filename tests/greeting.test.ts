import { describe, expect, it } from "vitest";
import { GREETING_DE, greetingKind } from "@/lib/greeting";

describe("greetingKind", () => {
  it("follows the local hour at the boundaries", () => {
    expect([4, 5, 10, 11, 17, 18, 21, 22, 0, 23].map(greetingKind)).toEqual([
      "night", "morning", "morning", "day", "day", "evening", "evening", "night", "night", "night",
    ]);
  });
  it("has German text for every kind, never the farewell Gute Nacht", () => {
    expect(GREETING_DE.morning).toBe("Guten Morgen!");
    expect(Object.values(GREETING_DE)).not.toContain("Gute Nacht!");
  });
});
