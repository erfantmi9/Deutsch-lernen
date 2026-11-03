import { describe, expect, it } from "vitest";
import { vocab } from "@/lib/vocab";
import { CATEGORY_ICON, CATEGORY_ICON_KEYS, ICON_BY_VOCAB_ID, NOUN_ICON_KEYS, getIconKey } from "@/lib/icons";
import { VOCAB_CATEGORIES } from "@/types/vocab";

describe("noun icons", () => {
  it("has at least 40 dedicated noun icons", () => {
    expect(NOUN_ICON_KEYS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(NOUN_ICON_KEYS).size).toBe(NOUN_ICON_KEYS.length);
  });

  it("maps every core-category vocab id to a dedicated icon", () => {
    // Words added by the extended categories fall back to their category icon.
    const core = new Set(["food", "family", "home", "travel", "time", "school", "body"]);
    const missing = vocab.filter((w) => core.has(w.category) && !ICON_BY_VOCAB_ID[w.id]).map((w) => w.id);
    expect(missing).toEqual([]);
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
