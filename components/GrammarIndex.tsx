"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useGrammarStore } from "@/stores/grammarStore";
import { lessonProgress, overallProgress } from "@/lib/grammarLogic";
import type { Locale } from "@/lib/grammarText";
import { GRAMMAR_GROUPS, GRAMMAR_GROUP_OF_TOPIC } from "@/types/grammar";
import type { GrammarTopic } from "@/types/grammar";
import type { I18n3 } from "@/types/common";
import PageHeader from "./PageHeader";
import ProgressRing from "./ProgressRing";
import GrammarHeader from "./illustrations/headers/GrammarHeader";
import GrammarTopicIcon from "./illustrations/GrammarTopicIcon";
import ConfirmDialog from "./ui/ConfirmDialog";

export interface LessonCard {
  id: string;
  order: number;
  topic: GrammarTopic;
  title: I18n3;
  summary: I18n3;
  exerciseIds: string[];
}

/** /grammar: all lessons as illustrated cards with their progress. */
export default function GrammarIndex({ lessons }: { lessons: LessonCard[] }) {
  const t = useTranslations("Grammar");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);

  const results = useGrammarStore((s) => s.results);
  const completedIds = useGrammarStore((s) => s.completedLessonIds);
  const reset = useGrammarStore((s) => s.reset);
  const [askReset, setAskReset] = useState(false);
  const tUi = useTranslations("Ui");

  // Persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useGrammarStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overall = ready ? overallProgress(lessons, results) : 0;
  const sections = GRAMMAR_GROUPS.map((group) => ({
    group,
    lessons: lessons.filter((l) => GRAMMAR_GROUP_OF_TOPIC[l.topic] === group),
  })).filter((s) => s.lessons.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<GrammarHeader size="100%" />}
        actions={
          <div className="flex items-center gap-3">
            <ProgressRing value={overall} size={48} label={t("progress", { percent: Math.round(overall * 100) })} />
            <span className="text-sm font-bold text-text-muted">{t("progress", { percent: Math.round(overall * 100) })}</span>
          </div>
        }
      />

      <div aria-label={t("lessonsList")} role="group" className="space-y-8">
        {sections.map(({ group, lessons: groupLessons }) => (
          <section key={group} aria-labelledby={`grammar-group-${group}`} className="space-y-3">
            <h2 id={`grammar-group-${group}`} className="text-lg font-extrabold">
              {t(`groups.${group}`)}{" "}
              <span className="text-sm font-bold text-text-muted">{t("groupCount", { count: groupLessons.length })}</span>
            </h2>
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {groupLessons.map((lesson) => {
                const progress = lessonProgress(lesson.exerciseIds, ready ? results : {});
                const done = ready && completedIds.includes(lesson.id);
                const status = done ? "statusDone" : progress.solved > 0 ? "statusProgress" : "statusNew";
                return (
                  <li key={lesson.id}>
                    <Link
                      href={`/grammar/${lesson.id}`}
                      className="card group flex h-full flex-col gap-4 p-5 transition duration-150 hover:-translate-y-1 hover:shadow-lift"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-16 shrink-0 rounded-2xl bg-surface-2 p-2 [&>svg]:h-auto [&>svg]:w-full">
                          <GrammarTopicIcon topic={lesson.topic} size="100%" />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="eyebrow">
                            {t("lessonNumber", { n: lesson.order })} · {t(`topics.${lesson.topic}`)}
                          </p>
                          <h3 className="text-xl font-extrabold [overflow-wrap:anywhere]">{lesson.title[locale]}</h3>
                        </div>
                        <ProgressRing
                          value={progress.fraction}
                          size={52}
                          label={t("exercisesSolved", { solved: progress.solved, total: progress.total })}
                        />
                      </div>
                      <p className="flex-1 text-sm text-text-muted">{lesson.summary[locale]}</p>
                      <p className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                        <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">
                          {done && <span aria-hidden="true">✓ </span>}
                          {t(status)}
                        </span>
                        <span className="text-text-muted">{t("exercisesSolved", { solved: progress.solved, total: progress.total })}</span>
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <div className="text-end">
        <button type="button" onClick={() => setAskReset(true)} aria-haspopup="dialog" className="btn-ghost">
          {t("reset")}
        </button>
        <ConfirmDialog
          open={askReset}
          title={tUi("resetTitle")}
          message={tUi("resetMessage", { area: t("title") })}
          confirmLabel={tUi("resetAction")}
          onCancel={() => setAskReset(false)}
          onConfirm={() => {
            reset();
            setAskReset(false);
          }}
        />
      </div>
    </div>
  );
}
