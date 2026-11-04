import { describe, expect, it } from "vitest";
import { computeKeyboardInset } from "@/components/ui/useKeyboardInset";

const base = { innerHeight: 667, height: 667, offsetTop: 0, scale: 1 };

describe("computeKeyboardInset", () => {
  it("is 0 with no keyboard", () => {
    expect(computeKeyboardInset(base)).toBe(0);
  });

  it("is the part of the layout viewport the visual viewport no longer covers", () => {
    expect(computeKeyboardInset({ ...base, height: 377 })).toBe(290);
  });

  it("accounts for offsetTop: iOS pans the visual viewport inside the layout viewport", () => {
    // Visual viewport 377 tall, panned 100px down: it ends at 477, so 190px at the bottom are covered, not 290.
    expect(computeKeyboardInset({ ...base, height: 377, offsetTop: 100 })).toBe(190);
  });

  it("ignores small insets (browser toolbar collapsing / expanding)", () => {
    expect(computeKeyboardInset({ ...base, height: 667 - 56 })).toBe(0);
    expect(computeKeyboardInset({ ...base, height: 667 - 119 })).toBe(0);
    expect(computeKeyboardInset({ ...base, height: 667 - 120 })).toBe(120);
  });

  it("ignores pinch zoom (scale > 1): the visual viewport shrinks for that reason, not because of a keyboard", () => {
    expect(computeKeyboardInset({ ...base, height: 400, scale: 1.5 })).toBe(0);
    expect(computeKeyboardInset({ ...base, height: 400, scale: 2.5, offsetTop: 30 })).toBe(0);
  });

  it("never goes negative (visual viewport taller than the layout viewport, e.g. overscroll)", () => {
    expect(computeKeyboardInset({ ...base, height: 700 })).toBe(0);
  });
});
