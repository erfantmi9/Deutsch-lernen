import { describe, expect, it } from "vitest";
import { BADGE_KEYS, BADGE_TARGETS, emptyBadgeInput, evaluateBadges } from "@/lib/badges";
import { BADGE_ART } from "@/components/illustrations/badges/registry";
import { ADVERB_KINDS, PHRASE_SITUATIONS } from "@/types/vocab-extended";
import { VOCAB_CATEGORIES } from "@/types/vocab";
import { reviewCards } from "@/lib/reviewData";
import en from "@/messages/en.json";
import fa from "@/messages/fa.json";
import de from "@/messages/de.json";

/** All dotted key paths of a nested messages object. */
function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

const get = (obj: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((o, k) => (typeof o === "object" && o !== null ? (o as Record<string, unknown>)[k] : undefined), obj);

describe("badges", () => {
  it("has 12 badges, each with a drawing and a target", () => {
    expect(BADGE_KEYS).toHaveLength(12);
    for (const key of BADGE_KEYS) {
      expect(BADGE_ART[key]).toBeTypeOf("function");
      expect(BADGE_TARGETS[key]).toBeGreaterThan(0);
    }
  });

  it("earns nothing from an empty record", () => {
    expect(evaluateBadges(emptyBadgeInput()).every((b) => !b.earned)).toBe(true);
  });

  it("earns a badge exactly at its target and caps the progress", () => {
    const input = { ...emptyBadgeInput(), grammarLessonsDone: 3, dialoguesPassed: 4, reviewAnswers: 500 };
    const byKey = Object.fromEntries(evaluateBadges(input).map((b) => [b.key, b]));
    expect(byKey.grammar3).toMatchObject({ earned: true, current: 3 });
    expect(byKey.dialogue5).toMatchObject({ earned: false, current: 4, target: 5 });
    expect(byKey.review50).toMatchObject({ earned: true, current: 50 });
  });

  it("counts the best streak across articles, verbs and sentences", () => {
    const b = evaluateBadges({ ...emptyBadgeInput(), sentenceBestStreak: 10 });
    expect(b.find((x) => x.key === "streak5")?.earned).toBe(true);
    expect(b.find((x) => x.key === "streak10")?.earned).toBe(true);
  });

  it("uses day streaks and mature cards for the new badges", () => {
    const b = evaluateBadges({ ...emptyBadgeInput(), longestDayStreak: 7, matureCards: 24 });
    expect(b.find((x) => x.key === "streak7")?.earned).toBe(true);
    expect(b.find((x) => x.key === "mature25")?.earned).toBe(false);
  });
});

describe("Stage 4 messages", () => {
  const namespaces = ["Vocabulary", "Review", "Progress", "Badges"] as const;

  it("have the same keys in en, fa and de", () => {
    for (const ns of namespaces) {
      const base = keys((en as Record<string, unknown>)[ns]).sort();
      expect(keys((fa as Record<string, unknown>)[ns]).sort(), `${ns} fa`).toEqual(base);
      expect(keys((de as Record<string, unknown>)[ns]).sort(), `${ns} de`).toEqual(base);
    }
  });

  it("have no empty strings", () => {
    for (const messages of [en, fa, de]) {
      for (const ns of namespaces) {
        for (const k of keys((messages as Record<string, unknown>)[ns])) {
          const v = get((messages as Record<string, unknown>)[ns], k);
          expect(typeof v === "string" && v.trim().length > 0, `${ns}.${k}`).toBe(true);
        }
      }
    }
  });

  it("label every filter group used on the vocabulary page", () => {
    for (const messages of [en, fa, de]) {
      const groups = messages.Vocabulary.groups as Record<string, Record<string, string>>;
      for (const c of VOCAB_CATEGORIES) expect(groups.noun[c], c).toBeTruthy();
      for (const k of ADVERB_KINDS) expect(groups.adverb[k], k).toBeTruthy();
      for (const s of PHRASE_SITUATIONS) expect(groups.phrase[s], s).toBeTruthy();
      for (const c of ["akk", "dat", "wechsel"]) expect(groups.preposition[c], c).toBeTruthy();
    }
  });

  it("have a title and description for every badge", () => {
    for (const messages of [en, fa, de]) {
      for (const key of BADGE_KEYS) {
        const b = (messages.Badges as Record<string, { title: string; desc: string }>)[key];
        expect(b?.title, key).toBeTruthy();
        expect(b?.desc, key).toBeTruthy();
      }
    }
  });

  it("give every review-card group a label", () => {
    const groups = en.Vocabulary.groups as Record<string, Record<string, string>>;
    for (const c of reviewCards) {
      if (c.group === undefined) continue;
      if (c.kind === "verb" || c.kind === "adjective") continue;
      expect(groups[c.kind]?.[c.group], `${c.kind}:${c.group}`).toBeTruthy();
    }
  });
});
