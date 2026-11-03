import { describe, expect, it } from "vitest";
import { activeDayCount, activityLevel, bumpActivity, calendarWeeks, currentStreak, KEEP_DAYS, longestStreak } from "@/lib/activity";
import { addDays } from "@/lib/dateKey";

const TODAY = "2026-03-11"; // a Wednesday

describe("activity streaks", () => {
  it("counts consecutive days ending today", () => {
    const days = { "2026-03-09": 3, "2026-03-10": 1, [TODAY]: 5 };
    expect(currentStreak(days, TODAY)).toBe(3);
  });

  it("keeps the streak alive until a full day is missed", () => {
    const days = { "2026-03-09": 3, "2026-03-10": 1 };
    expect(currentStreak(days, TODAY)).toBe(2);
    expect(currentStreak(days, "2026-03-12")).toBe(0);
  });

  it("is 0 without activity and ignores zero counts", () => {
    expect(currentStreak({}, TODAY)).toBe(0);
    expect(currentStreak({ [TODAY]: 0 }, TODAY)).toBe(0);
  });

  it("finds the longest run", () => {
    const days = { "2026-02-01": 1, "2026-02-02": 1, "2026-02-03": 1, "2026-02-10": 1, "2026-02-11": 1 };
    expect(longestStreak(days)).toBe(3);
    expect(longestStreak({})).toBe(0);
  });

  it("counts active days", () => {
    expect(activeDayCount({ a: 1, b: 0, c: 4 })).toBe(2);
  });
});

describe("bumpActivity", () => {
  it("adds to today without touching the input", () => {
    const days = { [TODAY]: 2 };
    const next = bumpActivity(days, TODAY, 3);
    expect(next[TODAY]).toBe(5);
    expect(days[TODAY]).toBe(2);
  });

  it("drops days older than the retention window", () => {
    const old = addDays(TODAY, -(KEEP_DAYS + 1));
    const kept = addDays(TODAY, -KEEP_DAYS);
    const next = bumpActivity({ [old]: 1, [kept]: 1 }, TODAY);
    expect(next[old]).toBeUndefined();
    expect(next[kept]).toBe(1);
  });
});

describe("activity calendar", () => {
  it("builds whole Monday-first weeks ending with the current week", () => {
    const weeks = calendarWeeks({ [TODAY]: 12 }, TODAY, 4);
    expect(weeks).toHaveLength(4);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    const last = weeks[3];
    expect(last[0].key).toBe("2026-03-09"); // Monday of the current week
    expect(last[2].key).toBe(TODAY);
    expect(last[2].isToday).toBe(true);
    expect(last[2].level).toBe(2);
    expect(last[3].isFuture).toBe(true);
    expect(weeks[0][0].key).toBe("2026-02-16");
  });

  it("maps counts to levels", () => {
    expect([0, 1, 9, 10, 29, 30].map(activityLevel)).toEqual([0, 1, 1, 2, 2, 3]);
  });
});
