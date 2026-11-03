"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { activeDayCount, calendarWeeks, currentStreak, longestStreak } from "@/lib/activity";
import type { ActivityLevel } from "@/lib/activity";
import { evaluateBadges } from "@/lib/badges";
import { dateKey } from "@/lib/dateKey";
import { numbersProgress } from "@/lib/numbersStats";
import type { ReviewCard } from "@/lib/reviewCards";
import { PASS_MARK } from "@/lib/scoreStats";
import { deckStats, hardestCards } from "@/lib/srs";
import { useActivityStore } from "@/stores/activityStore";
import { useDialogueStore } from "@/stores/dialogueStore";
import { useGrammarStore } from "@/stores/grammarStore";
import { useNumbersStore } from "@/stores/numbersStore";
import { useQuizStore } from "@/stores/quizStore";
import { useReadingStore } from "@/stores/readingStore";
import { useSentenceStore } from "@/stores/sentenceStore";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";
import { useVerbStore } from "@/stores/verbStore";
import PageHeader from "./PageHeader";
import ProgressRing from "./ProgressRing";
import { BADGE_ART } from "./illustrations/badges/registry";
import Mascot from "./illustrations/Mascot";

type Locale = "en" | "fa" | "de";

export interface ProgressTotals {
  grammar: number;
  dialogues: number;
  reading: number;
  sentences: number;
}

const WEEKS = 12;
const STREAK_GOAL = 10;
const WEAK_LIMIT = 6;

const CELL: Record<ActivityLevel, string> = {
  0: "bg-surface-2",
  1: "bg-primary/30",
  2: "bg-primary/60",
  3: "bg-primary",
};

const passedCount = (results: Readonly<Record<string, { best: number }>>): number =>
  Object.values(results).filter((r) => r.best >= PASS_MARK).length;

const ratio = (done: number, total: number): number => (total <= 0 ? 0 : Math.min(1, done / total));

export default function ProgressDashboard({ cards, totals }: { cards: readonly ReviewCard[]; totals: ProgressTotals }) {
  const t = useTranslations("Progress");
  const tBadge = useTranslations("Badges");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("1970-01-01");

  const days = useActivityStore((s) => s.days);
  // Selectors return primitives or stored references only (a fresh object each time would re-render forever).
  const quizScore = useQuizStore((s) => s.score);
  const quizBest = useQuizStore((s) => s.bestStreak);
  const quizWrong = useQuizStore((s) => s.wrongWordIds);
  const verbScore = useVerbStore((s) => s.score);
  const verbBest = useVerbStore((s) => s.bestStreak);
  const verbWrong = useVerbStore((s) => s.wrongVerbIds);
  const sentencesSolved = useSentenceStore((s) => s.solvedIds.length);
  const sentenceBest = useSentenceStore((s) => s.bestStreak);
  const grammarDone = useGrammarStore((s) => s.completedLessonIds.length);
  const numbers = useNumbersStore((s) => numbersProgress(s));
  const dialoguesPassed = useDialogueStore((s) => passedCount(s.results));
  const readingPassed = useReadingStore((s) => passedCount(s.results));
  const deck = useSrsStore((s) => s.cards);
  const reviewLog = useSrsStore((s) => s.log);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      useActivityStore.persist.rehydrate(),
      useQuizStore.persist.rehydrate(),
      useVerbStore.persist.rehydrate(),
      useSentenceStore.persist.rehydrate(),
      useGrammarStore.persist.rehydrate(),
      useNumbersStore.persist.rehydrate(),
      useDialogueStore.persist.rehydrate(),
      useReadingStore.persist.rehydrate(),
      ensureSrsHydrated(),
    ]).then(() => {
      if (cancelled) return;
      setToday(dateKey());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const stats = deckStats(deck, today);
  const streak = currentStreak(days, today);
  const longest = longestStreak(days);
  const active = activeDayCount(days);
  const weeks = useMemo(() => calendarWeeks(days, today, WEEKS), [days, today]);

  const badges = evaluateBadges({
    quizScore,
    quizBestStreak: quizBest,
    verbScore,
    verbBestStreak: verbBest,
    sentenceBestStreak: sentenceBest,
    sentencesSolved,
    activeDays: active,
    longestDayStreak: longest,
    grammarLessonsDone: grammarDone,
    dialoguesPassed,
    readingPassed,
    reviewAnswers: Object.values(reviewLog).reduce((n, d) => n + d.reviews, 0),
    matureCards: stats.mature,
  });
  const earned = badges.filter((b) => b.earned).length;

  const rings = [
    { key: "articles", value: ratio(quizBest, STREAK_GOAL) },
    { key: "verbs", value: ratio(verbBest, STREAK_GOAL) },
    { key: "sentences", value: ratio(sentencesSolved, totals.sentences) },
    { key: "grammar", value: ratio(grammarDone, totals.grammar) },
    { key: "numbers", value: numbers },
    { key: "dialogues", value: ratio(dialoguesPassed, totals.dialogues) },
    { key: "reading", value: ratio(readingPassed, totals.reading) },
    { key: "review", value: ratio(stats.mature, stats.total) },
  ] as const;

  const weakArticles = quizWrong.map((id) => byId.get(`noun:${id}`)).filter((c): c is ReviewCard => c !== undefined);
  const weakVerbs = verbWrong.map((id) => byId.get(`verb:${id}`)).filter((c): c is ReviewCard => c !== undefined);
  const weakCards = hardestCards(deck, WEAK_LIMIT)
    .map((c) => ({ card: byId.get(c.id), lapses: c.lapses }))
    .filter((x): x is { card: ReviewCard; lapses: number } => x.card !== undefined);
  const noWeak = weakArticles.length === 0 && weakVerbs.length === 0 && weakCards.length === 0;

  const tr = locale === "de" ? "en" : locale;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<Mascot mood={streak > 0 ? "cheering" : "waving"} size={120} className="mx-auto" />}
      />

      <section aria-labelledby="streak-title" className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="streak-title" className="text-xl font-extrabold">
              {t("streakTitle")}
            </h2>
            <p className="text-3xl font-extrabold text-primary">{t("currentStreak", { count: ready ? streak : 0 })}</p>
          </div>
          <div className="text-sm text-text-muted">
            <p>{t("longest", { count: ready ? longest : 0 })}</p>
            <p>{t("activeDays", { count: ready ? active : 0 })}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="eyebrow">{t("calendarTitle")}</p>
          <div role="img" aria-label={t("calendarAria")} className="grid grid-flow-col grid-rows-7 gap-1 sm:gap-1.5" dir="ltr">
            {weeks.flat().map((cell) => (
              <span
                key={cell.key}
                title={t("cellLabel", { date: cell.key, count: cell.count })}
                className={
                  "aspect-square w-full rounded-md " +
                  CELL[ready ? cell.level : 0] +
                  (cell.isToday ? " ring-2 ring-text" : "") +
                  (cell.isFuture ? " opacity-30" : "")
                }
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 text-xs text-text-muted" aria-hidden="true">
            <span>{t("legendLess")}</span>
            {([0, 1, 2, 3] as const).map((l) => (
              <span key={l} className={"size-3 rounded-sm " + CELL[l]} />
            ))}
            <span>{t("legendMore")}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="rings-title" className="card space-y-4 p-5 sm:p-6">
        <h2 id="rings-title" className="text-xl font-extrabold">
          {t("ringsTitle")}
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {rings.map((r) => {
            const value = ready ? r.value : 0;
            return (
              <li key={r.key} className="flex flex-col items-center gap-2 text-center">
                <ProgressRing value={value} size={80} label={`${t(`rings.${r.key}`)}: ${Math.round(value * 100)}%`} />
                <span className="text-sm font-bold">{t(`rings.${r.key}`)}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-text-muted">{t("ringsHint")}</p>
      </section>

      <section aria-labelledby="weak-title" className="card space-y-4 p-5 sm:p-6">
        <h2 id="weak-title" className="text-xl font-extrabold">
          {t("weakTitle")}
        </h2>
        {!ready || noWeak ? (
          <p className="text-text-muted">{t("weakEmpty")}</p>
        ) : (
          <div className="space-y-5">
            {weakArticles.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold">{t("weakArticles")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {weakArticles.map((c) => (
                    <li key={c.id} className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm">
                      <bdi dir="ltr" lang="de" className="font-extrabold">
                        {c.front}
                      </bdi>{" "}
                      <span lang={tr} className="text-text-muted">
                        {c.translations[tr]}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/arcade" className="btn btn-secondary">
                  {t("practiceArticles")}
                </Link>
              </div>
            )}
            {weakVerbs.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold">{t("weakVerbs")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {weakVerbs.map((c) => (
                    <li key={c.id} className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm">
                      <bdi dir="ltr" lang="de" className="font-extrabold">
                        {c.front}
                      </bdi>{" "}
                      <span lang={tr} className="text-text-muted">
                        {c.translations[tr]}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/verbs" className="btn btn-secondary">
                  {t("practiceVerbs")}
                </Link>
              </div>
            )}
            {weakCards.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold">{t("weakCards")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {weakCards.map(({ card, lapses }) => (
                    <li key={card.id} className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm">
                      <bdi dir="ltr" lang="de" className="font-extrabold">
                        {card.front}
                      </bdi>{" "}
                      <span className="text-text-muted">{t("lapses", { count: lapses })}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/review" className="btn btn-secondary">
                  {t("practiceReview")}
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="badges-title" className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="badges-title" className="text-xl font-extrabold">
            {t("badgesTitle")}
          </h2>
          <p className="text-sm font-bold text-text-muted">
            {t("badgesCount", { earned: ready ? earned : 0, total: badges.length })}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b) => {
            const Art = BADGE_ART[b.key];
            const isEarned = ready && b.earned;
            return (
              <li key={b.key} className="flex flex-col items-center gap-2 text-center">
                <Art size={72} locked={!isEarned} />
                <p className="font-extrabold">{tBadge(`${b.key}.title`)}</p>
                <p className="text-xs text-text-muted">{tBadge(`${b.key}.desc`)}</p>
                <p className={"text-xs font-extrabold " + (isEarned ? "text-success" : "text-text-muted")}>
                  {isEarned ? `✓ ${t("badgeEarned")}` : t("badgeLocked", { current: ready ? b.current : 0, target: b.target })}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
