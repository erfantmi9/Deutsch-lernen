import { describe, expect, it } from "vitest";
import {
  applyResult,
  checkAnswer,
  checkPerfekt,
  pickQuestion,
  presentAnswers,
  stripUmlauts,
} from "../lib/verbDrill";
import { filterVerbs, getChangedPersons, getVerb, getVerbsByType, parseVerbUsage, perfektForms, sortByUsage, verbs } from "../lib/verbs";
import { VERB_USAGES } from "../types/verb";

const fahren = getVerb("fahren")!;
const aufstehen = getVerb("aufstehen")!;

describe("checkAnswer", () => {
  it("is case-insensitive and trims", () => {
    expect(checkAnswer("  FÄHRST ", "fährst")).toBe("correct");
  });
  it("checks umlauts strictly and flags umlaut-only mistakes", () => {
    expect(checkAnswer("fahrst", "fährst")).toBe("umlaut");
    expect(checkAnswer("faehrst", "fährst")).toBe("wrong");
  });
  it("checks ß strictly and flags it", () => {
    expect(checkAnswer("heisst", "heißt")).toBe("umlaut");
    expect(checkAnswer("heißt", "heißt")).toBe("correct");
  });
  it("returns wrong for a different word and for empty input", () => {
    expect(checkAnswer("fährt", "fährst")).toBe("wrong");
    expect(checkAnswer("", "fährst")).toBe("wrong");
  });
  it("accepts any of several answers", () => {
    expect(checkAnswer("stehe", ["stehe auf", "stehe"])).toBe("correct");
  });
  it("stripUmlauts maps ä ö ü ß", () => {
    expect(stripUmlauts("müßt äö")).toBe("musst ao");
  });
});

describe("presentAnswers / checkPerfekt", () => {
  it("separable verbs accept the form with or without prefix, and display the full split form", () => {
    const r = presentAnswers(aufstehen, "ich");
    expect(r.display).toBe("stehe auf");
    expect(r.accepted).toEqual(["stehe auf", "stehe"]);
  });
  it("needs the right auxiliary and a correct participle", () => {
    expect(checkPerfekt("sein", "gefahren", fahren).correct).toBe(true);
    expect(checkPerfekt("haben", "gefahren", fahren)).toMatchObject({ auxCorrect: false, correct: false });
    expect(checkPerfekt("sein", "gefahrn", fahren).correct).toBe(false);
    expect(checkPerfekt(null, "gefahren", fahren).correct).toBe(false);
  });
});

describe("pickQuestion", () => {
  it("never repeats the same verb twice in a row", () => {
    for (let i = 0; i < 200; i++) {
      expect(pickQuestion(verbs, "mixed", [], "gehen").verb.id).not.toBe("gehen");
    }
  });
  it("picks wrong verbs more often", () => {
    let hits = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) if (pickQuestion(verbs, "present", ["sein"], null).verb.id === "sein") hits++;
    // weight 4 of 4 + (N-1) others = 4/(N+3) vs 1/N unweighted (N=63: ≈6.1% vs ≈1.6%), so well above 2.5/N.
    expect(hits / n).toBeGreaterThan(2.5 / verbs.length);
  });
  it("respects the mode", () => {
    expect(pickQuestion(verbs, "perfekt", [], null).kind).toBe("perfekt");
    expect(pickQuestion(verbs, "present", [], null).kind).toBe("present");
  });
  it("works with a single-verb pool", () => {
    expect(pickQuestion([fahren], "present", [], "fahren").verb.id).toBe("fahren");
  });
});

describe("applyResult", () => {
  const base = { score: 0, streak: 0, bestStreak: 0, wrongVerbIds: [] as string[] };
  it("tracks score, streak, best streak and wrong ids", () => {
    const a = applyResult(base, "gehen", true);
    expect(a).toMatchObject({ score: 1, streak: 1, bestStreak: 1 });
    const b = applyResult(a, "sein", false);
    expect(b).toMatchObject({ score: 1, streak: 0, bestStreak: 1, wrongVerbIds: ["sein"] });
    expect(applyResult(b, "sein", true).wrongVerbIds).toEqual([]);
  });
});

describe("verb helpers", () => {
  it("getChangedPersons finds the stem-changing forms", () => {
    expect(getChangedPersons(fahren)).toEqual(["du", "er_sie_es"]);
    expect(getChangedPersons(getVerb("essen")!)).toEqual(["du", "er_sie_es"]);
    expect(getChangedPersons(getVerb("koennen")!)).toEqual(["ich", "du", "er_sie_es"]);
    expect(getChangedPersons(getVerb("machen")!)).toEqual([]);
  });
  it("perfektForms builds auxiliary + participle", () => {
    expect(perfektForms(fahren).er_sie_es).toBe("ist gefahren");
    expect(perfektForms(getVerb("machen")!).ich).toBe("habe gemacht");
  });
  it("getters and filters", () => {
    expect(getVerbsByType("modal").map((v) => v.id)).toEqual(["koennen", "muessen", "wollen", "duerfen", "moegen", "sollen"]);
    expect(filterVerbs({ type: "separable", level: "A1" }).map((v) => v.id)).toEqual([
      "aufstehen", "anrufen", "einkaufen", "ankommen", "einladen", "mitkommen", "anfangen", "aufmachen",
      "zumachen", "fernsehen", "abholen", "aussteigen", "einsteigen", "umsteigen", "mitbringen", "abfahren", "anmachen",
      "ausmachen", "anmelden", "ansehen", "anziehen", "ausziehen", "ausfuellen", "aussehen", "ausgehen", "aufraeumen",
      "aufwachen", "einschlafen", "kennenlernen", "mitnehmen", "zuhoeren", "zurueckkommen", "umziehen", "ankreuzen", "aufhoeren",
    ]);
    expect(filterVerbs({ type: "reflexive" }).map((v) => v.id)).toEqual(["freuen", "interessieren", "setzen", "beeilen", "vorstellen", "entschuldigen"]);
    expect(filterVerbs({ type: "modal", category: "movement" })).toEqual([]);
    expect(getVerb("nope")).toBeUndefined();
  });
  it("ranks every verb by usage, essentials first", () => {
    const essential = filterVerbs({ usage: "essential" });
    expect(essential.length).toBeGreaterThanOrEqual(35);
    expect(essential.length).toBeLessThanOrEqual(45);
    for (const id of ["sein", "haben", "gehen", "koennen", "machen"]) expect(getVerb(id)!.usage).toBe("essential");
    const sorted = sortByUsage(verbs).map((v) => VERB_USAGES.indexOf(v.usage));
    expect(sorted).toEqual([...sorted].sort((a, b) => a - b));
    expect(sortByUsage(verbs)).toHaveLength(verbs.length);
    expect(parseVerbUsage("common")).toBe("common");
    expect(parseVerbUsage("nope")).toBeNull();
    expect(parseVerbUsage(null)).toBeNull();
  });
});
