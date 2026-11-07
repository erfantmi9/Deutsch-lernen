import { describe, expect, it } from "vitest";
import { EXAM_SESSION_VERSION, migrateSession, secondsLeft, warningFor } from "@/lib/examSession";

const valid = {
  version: EXAM_SESSION_VERSION,
  current: "schreiben",
  plan: ["sprechen"],
  results: { lesen: { module: "lesen", points: 20, got: 8, total: 10 } },
  fullRun: true,
  endsAt: 1_000_000,
  answers: { schreiben: { values: { name: "Anna" }, message: "Hallo" } },
};

describe("migrateSession", () => {
  it("keeps a valid session", () => {
    expect(migrateSession(valid)).toEqual(valid);
  });

  it("never throws and returns null for junk / old shapes", () => {
    for (const raw of [null, undefined, "abc", 42, [], {}, { version: 1, module: "lesen", secondsLeft: 300 }, { ...valid, version: 3 }]) {
      expect(() => migrateSession(raw)).not.toThrow();
      expect(migrateSession(raw)).toBeNull();
    }
  });

  it("drops a running part that has no deadline (cannot resume honestly)", () => {
    expect(migrateSession({ ...valid, endsAt: "soon" })).toBeNull();
  });

  it("filters invalid modules, results and answer keys instead of failing", () => {
    const s = migrateSession({
      ...valid,
      plan: ["sprechen", "kochen", 7],
      results: { lesen: { module: "lesen", points: "x" }, hoeren: { module: "hoeren", points: 10, got: 2, total: 5 }, foo: {} },
      answers: { schreiben: 1, nope: 2 },
    })!;
    expect(s.plan).toEqual(["sprechen"]);
    expect(Object.keys(s.results)).toEqual(["hoeren"]);
    expect(Object.keys(s.answers)).toEqual(["schreiben"]);
  });

  it("returns null when nothing is left to resume", () => {
    expect(migrateSession({ ...valid, current: null, plan: [], endsAt: null })).toBeNull();
  });

  it("keeps the between-parts state of a full run", () => {
    expect(migrateSession({ ...valid, current: null, endsAt: null })?.plan).toEqual(["sprechen"]);
  });
});

describe("timer helpers", () => {
  it("secondsLeft rounds up and never goes negative", () => {
    expect(secondsLeft(10_000, 0)).toBe(10);
    expect(secondsLeft(10_000, 9_001)).toBe(1);
    expect(secondsLeft(10_000, 20_000)).toBe(0);
  });
  it("warnings: none, five, minute", () => {
    expect(warningFor(301)).toBeNull();
    expect(warningFor(300)).toBe("five");
    expect(warningFor(61)).toBe("five");
    expect(warningFor(60)).toBe("minute");
    expect(warningFor(0)).toBe("minute");
  });
});
