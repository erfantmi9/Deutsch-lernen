"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GOAL_CHOICES, goalFraction } from "@/lib/learningPath";
import { useLearnStore } from "@/stores/learnStore";
import ProgressRing from "./ProgressRing";
import { useHomeProgress } from "./useHomeProgress";

const Arrow = () => (
  <span aria-hidden="true" className="rtl:-scale-x-100">
    →
  </span>
);

/** Same size as a .btn with a short label; shown until saved progress has loaded. */
const ButtonSkeleton = () => <span aria-hidden="true" className="block h-11 w-36 animate-pulse rounded-full bg-surface-2" />;

/**
 * Home page: "continue where you left off" and today's due reviews (above the module cards), the daily goal and the
 * recommended path. Every card keeps its size while the stores load: a skeleton with aria-busy, never a default label
 * that is swapped for the real one.
 */
export default function HomePath() {
  const t = useTranslations("Path");
  const tNav = useTranslations("Nav");
  const setGoal = useLearnStore((s) => s.setDailyGoal);
  const { ready, steps, deckSize, due, todayCount, goal, resume } = useHomeProgress();

  const doneCount = steps.filter((s) => s.done).length;
  const fraction = goalFraction(todayCount, goal);

  return (
    <section aria-labelledby="path-title" className="space-y-5">
      <h2 id="path-title" className="text-2xl font-extrabold">
        {t("title")}
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div data-continue-box aria-busy={!ready} className="card flex flex-col justify-center gap-2 p-5">
          <p className="font-extrabold">{t("continueTitle")}</p>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-text-muted">
            {!ready ? <span className="sr-only">{t("loading")}</span> : resume ? t("continueText", { section: tNav(resume.section) }) : t("continueEmpty")}
          </p>
          {!ready ? (
            <ButtonSkeleton />
          ) : (
            <Link href={resume?.href ?? "/arcade"} className="btn btn-primary self-start">
              {resume ? t("continueButton") : t("startButton")} <Arrow />
            </Link>
          )}
        </div>

        <div data-due-box aria-busy={!ready} className="card flex flex-col justify-center gap-2 p-5">
          <p className="font-extrabold">{t("dueTitle")}</p>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-text-muted">
            {!ready ? <span className="sr-only">{t("loading")}</span> : deckSize === 0 ? t("dueEmpty") : t("dueText", { count: due })}
          </p>
          {!ready ? (
            <ButtonSkeleton />
          ) : (
            <Link href="/review" className={"self-start " + (due > 0 ? "btn btn-primary" : "btn btn-secondary")}>
              {t("dueButton")} <Arrow />
            </Link>
          )}
        </div>

        <div className="card flex items-center gap-4 p-5 md:col-span-2">
          <ProgressRing value={ready ? fraction : 0} size={84} label={t("goalRing", { percent: Math.round((ready ? fraction : 0) * 100) })} />
          <div className="space-y-2">
            <p className="font-extrabold">{t("goalTitle")}</p>
            <p className="min-h-5 text-sm leading-5 text-text-muted" aria-live="polite" aria-busy={!ready}>
              {!ready ? "" : fraction >= 1 ? t("goalDone") : t("goalProgress", { done: todayCount, goal })}
            </p>
            <div role="group" aria-label={t("goalChoose")} className="flex flex-wrap gap-2">
              {GOAL_CHOICES.map((g) => (
                <button key={g} type="button" aria-pressed={ready && goal === g} onClick={() => setGoal(g)} className="pill min-h-11 px-4">
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-extrabold">{t("pathTitle")}</h3>
          <p className="text-sm font-bold text-text-muted">{t("pathCount", { done: ready ? doneCount : 0, total: steps.length })}</p>
        </div>
        <ol className="grid gap-2 sm:grid-cols-2">
          {steps.map((s, i) => {
            const done = ready && s.done;
            const current = ready && s.current;
            return (
              <li key={s.id}>
                <Link
                  href={s.href}
                  aria-current={current ? "step" : undefined}
                  className={
                    "flex min-h-14 items-center gap-3 rounded-2xl border p-3 transition hover:bg-surface-2 " +
                    (current ? "border-primary bg-primary-soft" : "border-border")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold " +
                      (done ? "bg-success text-on-primary" : current ? "bg-primary text-on-primary" : "bg-surface-2 text-text-muted")
                    }
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-extrabold">{t(`steps.${s.id}.title`)}</span>
                    <span className="block text-xs text-text-muted">{t(`steps.${s.id}.desc`)}</span>
                  </span>
                  <span className="ms-auto text-xs font-extrabold">
                    {done ? t("stateDone") : current ? t("stateNext") : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
