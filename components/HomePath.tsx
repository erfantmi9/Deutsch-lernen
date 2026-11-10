"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { currentStreak } from "@/lib/activity";
import { dateKey } from "@/lib/dateKey";
import { GOAL_CHOICES, goalFraction } from "@/lib/learningPath";
import { useLearnStore } from "@/stores/learnStore";
import ProgressRing from "./ProgressRing";
import { useHomeProgress } from "./useHomeProgress";

/**
 * Home page: the recommended path as one vertical line of steps, the current one highlighted. Done steps stay
 * clickable for repetition. The daily goal and streak appear only once the learner has answered something, so a
 * first visit shows nothing but the way in.
 */
export default function HomePath() {
  const t = useTranslations("Path");
  const { ready, steps } = useHomeProgress();
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section aria-labelledby="path-title" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="path-title" className="text-2xl font-extrabold">
          {t("title")}
        </h2>
        <p className="text-sm font-bold text-text-muted">{t("pathCount", { done: ready ? doneCount : 0, total: steps.length })}</p>
      </div>
      <p className="text-sm text-text-muted">{t("pathIntro")}</p>

      <ol className="relative space-y-2 before:absolute before:inset-y-5 before:start-[1.95rem] before:w-0.5 before:bg-border">
        {steps.map((s, i) => {
          const done = ready && s.done;
          const current = ready && s.current;
          return (
            <li key={s.id} className="relative">
              <Link
                href={s.href}
                aria-current={current ? "step" : undefined}
                className={
                  "flex min-h-14 items-center gap-3 rounded-2xl border p-3 transition hover:bg-surface-2 " +
                  (current ? "border-primary bg-primary-soft shadow-lift" : "border-transparent")
                }
              >
                <span
                  aria-hidden="true"
                  className={
                    "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ring-4 ring-background " +
                    (done ? "bg-success text-on-primary" : current ? "bg-primary text-on-primary" : "bg-surface-2 text-text-muted")
                  }
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={"block font-extrabold " + (done ? "text-text-muted" : "")}>{t(`steps.${s.id}.title`)}</span>
                  <span className="block text-xs text-text-muted">{t(`steps.${s.id}.desc`)}</span>
                </span>
                <span className={"ms-auto shrink-0 text-xs font-extrabold " + (current ? "text-primary" : "text-text-muted")}>
                  {done ? t("stateDone") : current ? t("stateNext") : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Daily goal and streak. Rendered only after the first answer: before that there is nothing to measure. */
export function HomeGoal() {
  const t = useTranslations("Path");
  const setGoal = useLearnStore((s) => s.setDailyGoal);
  const { ready, hasActivity, todayCount, goal, streakDays } = useHomeProgress();
  if (!ready || !hasActivity) return null;

  const fraction = goalFraction(todayCount, goal);
  const streak = currentStreak(streakDays, dateKey());

  return (
    <section aria-labelledby="goal-title" data-goal className="card flex flex-wrap items-center gap-4 p-5">
      <ProgressRing value={fraction} size={84} label={t("goalRing", { percent: Math.round(fraction * 100) })} />
      <div className="min-w-0 flex-1 space-y-2">
        <h2 id="goal-title" className="font-extrabold">
          {t("goalTitle")}
        </h2>
        <p className="text-sm text-text-muted" aria-live="polite">
          {fraction >= 1 ? t("goalDone") : t("goalProgress", { done: todayCount, goal })}
          {streak > 0 && <> · {t("streak", { count: streak })}</>}
        </p>
        <div role="group" aria-label={t("goalChoose")} className="flex flex-wrap items-center gap-2">
          {GOAL_CHOICES.map((g) => (
            <button key={g} type="button" aria-pressed={goal === g} onClick={() => setGoal(g)} className="pill min-h-11 px-4">
              {g}
            </button>
          ))}
          <Link href="/progress" className="ms-auto text-sm font-bold underline">
            {t("progressLink")}
          </Link>
        </div>
      </div>
    </section>
  );
}
