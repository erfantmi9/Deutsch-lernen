"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DIFFICULTIES } from "@/types/listening";
import { useListenStore } from "@/stores/listenStore";

/** In hard mode a text may be played this many times, as in the exam. */
export const HARD_PLAYS = 2;

/** Easy / Real life / Hard: how loud the background is, how short the pauses, and (hard) two plays only. */
export default function DifficultyPicker() {
  const t = useTranslations("Listen.difficulty");
  const difficulty = useListenStore((s) => s.difficulty);
  const setDifficulty = useListenStore((s) => s.setDifficulty);
  useEffect(() => {
    void useListenStore.persist.rehydrate();
  }, []);
  return (
    <div className="space-y-1.5">
      <div role="group" aria-label={t("label")} className="flex flex-wrap gap-2">
        {DIFFICULTIES.map((d) => (
          <button key={d} type="button" aria-pressed={difficulty === d} onClick={() => setDifficulty(d)} className="pill" data-difficulty={d}>
            {t(`levels.${d}`)}
          </button>
        ))}
      </div>
      <p className="text-xs text-text-muted">{t(`hints.${difficulty}`, { plays: HARD_PLAYS })}</p>
    </div>
  );
}

/**
 * Plays of the current text, reset when `itemId` changes. In hard mode the text may be played HARD_PLAYS times and
 * the slow button is gone, as in the exam.
 */
export function usePlayLimit(itemId: string) {
  const difficulty = useListenStore((s) => s.difficulty);
  const [state, setState] = useState({ id: itemId, plays: 0 });
  const plays = state.id === itemId ? state.plays : 0;
  const hard = difficulty === "hard";
  return {
    difficulty,
    hard,
    plays,
    exhausted: hard && plays >= HARD_PLAYS,
    played: () => setState((s) => ({ id: itemId, plays: (s.id === itemId ? s.plays : 0) + 1 })),
  };
}

/** "Played 1 of 2" in hard mode. */
export function PlayCount({ plays, hard }: { plays: number; hard: boolean }) {
  const t = useTranslations("Listen.difficulty");
  if (!hard) return null;
  return (
    <span className="text-sm font-bold text-text-muted" data-play-count={plays}>
      {plays >= HARD_PLAYS ? t("noMorePlays") : t("plays", { plays, max: HARD_PLAYS })}
    </span>
  );
}
