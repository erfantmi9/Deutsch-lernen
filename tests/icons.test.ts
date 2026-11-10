import { describe, expect, it } from "vitest";
import { vocab } from "@/lib/vocab";
import { CATEGORY_ICON, CATEGORY_ICON_KEYS, ICON_BY_VOCAB_ID, NOUN_ICON_KEYS, getIconKey } from "@/lib/icons";
import { VOCAB_CATEGORIES } from "@/types/vocab";

describe("noun icons", () => {
  it("has at least 40 dedicated noun icons", () => {
    expect(NOUN_ICON_KEYS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(NOUN_ICON_KEYS).size).toBe(NOUN_ICON_KEYS.length);
  });

  it("draws only real nouns, and every drawing is reachable from its noun", () => {
    // Words without a drawing fall back to their category icon (see below).
    const ids = new Set(vocab.map((w) => w.id));
    expect(NOUN_ICON_KEYS.filter((k) => !ids.has(k))).toEqual([]);
    for (const k of NOUN_ICON_KEYS) expect(ICON_BY_VOCAB_ID[k]).toBe(k);
  });

  it("falls back to the category icon for unknown words", () => {
    for (const c of VOCAB_CATEGORIES) {
      expect(CATEGORY_ICON_KEYS).toContain(CATEGORY_ICON[c]);
      expect(getIconKey("does-not-exist", c)).toBe(CATEGORY_ICON[c]);
    }
    expect(getIconKey("does-not-exist")).toBeNull();
  });

  it("resolves aliases", () => {
    expect(getIconKey("saft")).toBe("getraenk");
  });
});
