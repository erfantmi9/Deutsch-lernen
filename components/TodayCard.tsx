"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GREETING_DE, greetingKind } from "@/lib/greeting";
import { resumeSection } from "@/lib/learningPath";
import Mascot from "./illustrations/Mascot";
import { useHomeProgress } from "./useHomeProgress";

const Arrow = () => (
  <span aria-hidden="true" className="rtl:-scale-x-100">
    →
  </span>
);

// Everything above the button keeps its height from the first paint (skeleton) to the hydrated card, so the button
// never moves. Text whose length varies with the state (the "why", the how-it-works row) sits below the button.
const GREETING = "flex min-h-11 min-w-0 items-center gap-2 sm:pe-28";
const EYEBROW = "flex min-h-8 items-center gap-3";
// One line on every screen: the longest title ("Nominativ und Akkusativ") fits at 375px in text-xl.
const TITLE = "min-h-8 truncate text-xl font-extrabold leading-8 sm:min-h-9 sm:pe-28 sm:text-3xl sm:leading-9";
const CTA = "btn btn-primary h-14 w-full px-6 text-lg sm:w-auto sm:min-w-72";
const HINT = "min-h-10 text-sm leading-5 text-text-muted";

/**
 * The one thing to do now, at the top of the home page. Priority: cards due for review first (short, and forgotten
 * otherwise), then the next step of the learning path. A first-time visitor also sees how the app works.
 */
export default function TodayCard() {
  const t = useTranslations("Path");
  const tNav = useTranslations("Nav");
  const locale = useLocale();
  const { ready, steps, nextStep, due, isNew, resume } = useHomeProgress();

  const doneCount = steps.filter((s) => s.done).length;
  const stepNumber = Math.max(1, steps.findIndex((s) => s.id === nextStep.id) + 1);
  const allDone = doneCount === steps.length;
  const reviewFirst = ready && due > 0;
  const stepTitle = t(`steps.${nextStep.id}.title`);
  // Local time of the learner's device. Read only after mount (ready), so server and client HTML always agree.
  const greeting = ready ? greetingKind(new Date().getHours()) : null;
  // "Back to where you were" only when that is somewhere else than the button already goes.
  const resumeElsewhere =
    resume && !reviewFirst && resume.section !== "review" && resumeSection(nextStep.href) !== resume.section ? resume : null;

  return (
    <section aria-labelledby="today-title" data-today aria-busy={!ready} className="card relative space-y-4 overflow-hidden p-5 sm:p-7">
      <Mascot mood={greeting === "night" ? "sleeping" : "waving"} size={96} className="absolute end-4 top-3 hidden sm:block" />

      <div className={GREETING} data-greeting={greeting ?? undefined}>
        {greeting && (
          <>
            <bdi dir="ltr" lang="de" className="shrink-0 text-xl font-extrabold">
              {GREETING_DE[greeting]}
            </bdi>
            {/* The German interface needs no translation of a German greeting. */}
            {locale !== "de" && <span className="min-w-0 truncate text-sm text-text-muted">{t(`greeting.${greeting}`)}</span>}
          </>
        )}
      </div>

      <div className={EYEBROW} data-today-eyebrow>
        {!ready ? (
          <span className="sr-only">{t("loading")}</span>
        ) : isNew ? (
          <span className="eyebrow">{t("firstStep")}</span>
        ) : (
          <>
            <span className="eyebrow">{allDone ? t("allDone", { total: steps.length }) : t("todayStep", { n: stepNumber, total: steps.length })}</span>
            <span
              role="progressbar"
              aria-label={t("pathCount", { done: doneCount, total: steps.length })}
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
              className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-surface-2 sm:w-32"
            >
              <span className="block h-full rounded-full bg-primary" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
            </span>
          </>
        )}
      </div>

      <h2 id="today-title" className={TITLE}>
        {!ready ? (
          <span aria-hidden="true" className="block h-8 w-64 max-w-full animate-pulse rounded-xl bg-surface-2 sm:h-9" />
        ) : reviewFirst ? (
          t("reviewTitle", { count: due })
        ) : (
          stepTitle
        )}
      </h2>

      <div className="space-y-2">
        {!ready ? (
          <span data-hero-cta aria-busy="true" className={CTA + " animate-pulse opacity-60 hover:translate-y-0"}>
            <span className="sr-only">{t("loading")}</span>
          </span>
        ) : (
          <Link data-hero-cta href={reviewFirst ? "/review" : nextStep.href} className={CTA}>
            <span className="truncate">{reviewFirst ? t("dueButton") : isNew ? t("startFirst") : t("startStep")}</span>
            <Arrow />
          </Link>
        )}
        <p data-hero-hint className={HINT}>
          {!ready ? (
            ""
          ) : reviewFirst ? (
            <Link data-skip-link href={nextStep.href} className="font-bold text-text underline">
              {t("skipToStep", { step: stepTitle })}
            </Link>
          ) : (
            <>
              <span className="font-bold text-text">{t("finishLabel")}</span> {t(`steps.${nextStep.id}.desc`)}
            </>
          )}
        </p>
      </div>

      {ready && (
        <p data-today-why className="max-w-prose border-t border-border pt-4 leading-6 text-text-muted">
          {reviewFirst ? t("reviewWhy") : t(`steps.${nextStep.id}.why`)}
        </p>
      )}

      {ready && isNew && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold">{t("howTitle")}:</span>
          <ol aria-label={t("howTitle")} className="flex flex-wrap items-center gap-1 text-xs font-bold">
            {(["howLearn", "howPractise", "howReview"] as const).map((k, i) => (
              <li key={k} className="flex items-center gap-1">
                {i > 0 && (
                  <span aria-hidden="true" className="text-text-muted rtl:-scale-x-100">
                    →
                  </span>
                )}
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-primary">
                  {i + 1}. {t(k)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {ready && resumeElsewhere && (
        <p>
          <Link data-resume-link href={resumeElsewhere.href} className="text-sm font-bold text-primary underline">
            {t("backTo", { section: tNav(resumeElsewhere.section) })}
          </Link>
        </p>
      )}
    </section>
  );
}
