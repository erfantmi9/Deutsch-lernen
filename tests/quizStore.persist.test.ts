import { beforeAll, describe, expect, it, vi } from "vitest";

// The quiz store persists to localStorage. Node has none, so provide an in-memory one BEFORE the store module loads.
const mem = new Map<string, string>();
const KEY = "deutsch-learner:quiz";

beforeAll(() => {
  // zustand persist reads window.localStorage, and Node has neither; stubGlobal because recent Node versions
  // define localStorage as a getter-only global that plain assignment cannot replace.
  const storage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  };
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
});

describe("quizStore persisted shape", () => {
  it("keeps score, streak, bestStreak and wrongWordIds from the OLD shape (no autoAdvance) and defaults autoAdvance to on", async () => {
    // Exactly what versions before the auto-advance setting wrote. The store version is unchanged (1): the new
    // field is additive, and zustand merges persisted state over the defaults, so no migrate() is needed.
    mem.set(KEY, JSON.stringify({ state: { score: 7, streak: 3, bestStreak: 9, wrongWordIds: ["a", "b"] }, version: 1 }));

    const { useQuizStore } = await import("@/stores/quizStore");
    await useQuizStore.persist.rehydrate();

    const s = useQuizStore.getState();
    expect(s.score).toBe(7);
    expect(s.streak).toBe(3);
    expect(s.bestStreak).toBe(9);
    expect(s.wrongWordIds).toEqual(["a", "b"]);
    expect(s.autoAdvance).toBe(true);
    expect(typeof s.answer).toBe("function"); // actions survive the merge

    // Writing back keeps the old data and adds the new field.
    s.setAutoAdvance(false);
    const saved = JSON.parse(mem.get(KEY)!);
    expect(saved.version).toBe(1);
    expect(saved.state).toMatchObject({ score: 7, streak: 3, bestStreak: 9, wrongWordIds: ["a", "b"], autoAdvance: false });
  });

  it("respects a persisted autoAdvance: false", async () => {
    mem.set(KEY, JSON.stringify({ state: { score: 1, streak: 0, bestStreak: 1, wrongWordIds: [], autoAdvance: false }, version: 1 }));
    const { useQuizStore } = await import("@/stores/quizStore");
    await useQuizStore.persist.rehydrate();
    expect(useQuizStore.getState().autoAdvance).toBe(false);
    expect(useQuizStore.getState().score).toBe(1);
  });
});
