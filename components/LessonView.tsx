"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { highlightSegments } from "@/lib/grammarText";
import type { Locale } from "@/lib/grammarText";
import type { GlossaryEntry, GrammarExercise, GrammarLesson } from "@/types/grammar";
import type { I18n3 } from "@/types/common";
import GrammarExerciseRunner from "./GrammarExerciseRunner";
import GrammarTable from "./GrammarTable";
import MiniMarkdown from "./MiniMarkdown";
import PageHeader from "./PageHeader";
import GrammarTopicIcon from "./illustrations/GrammarTopicIcon";

export interface LessonLink {
  id: string;
  title: I18n3;
}

function Example({ de, en, fa, highlight, locale }: GrammarLesson["examples"][number] & { locale: Locale }) {
  const translationLocale = locale === "de" ? "en" : locale;
  const translation = translationLocale === "fa" ? fa : en;
  return (
    <li className="space-y-1 rounded-2xl bg-surface-2 p-4">
      <p dir="ltr" lang="de" className="text-lg font-extrabold">
        {highlightSegments(de, highlight).map((seg, i) =>
          seg.highlight ? (
            <mark key={i} className="rounded-md bg-primary-soft px-1 text-primary">
              {seg.text}
            </mark>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      <p lang={translationLocale} className="text-sm text-text-muted">
        {translation}
      </p>
    </li>
  );
}

/** One grammar lesson: sections with tables, examples, then the practice runner. */
export default function LessonView({
  lesson,
  exercises,
  glossary,
  prev,
  next,
}: {
  lesson: GrammarLesson;
  exercises: GrammarExercise[];
  glossary: GlossaryEntry[];
  prev: LessonLink | null;
  next: LessonLink | null;
}) {
  const t = useTranslations("Grammar");
  const locale = useLocale() as Locale;

  // Scroll the practice section into view (html scroll-padding keeps it clear of the sticky header) and move focus there,
  // so keyboard and screen-reader users land on it too.
  const jumpToPractice = () => {
    const el = document.getElementById("practice");
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.focus({ preventScroll: true });
  };

  return (
    <div className="space-y-8">
      <Link href="/grammar" className="btn-ghost">
        <span aria-hidden="true" className="me-1 rtl:-scale-x-100">←</span> {t("backToGrammar")}
      </Link>

      <PageHeader
        title={lesson.title[locale]}
        subtitle={lesson.summary[locale]}
        actions={
          <button type="button" className="btn btn-secondary" data-practice-jump onClick={jumpToPractice}>
            {t("jumpToPractice")} <span aria-hidden="true">↓</span>
          </button>
        }
        illustration={
          <div className="mx-auto w-20 sm:w-28">
            <GrammarTopicIcon topic={lesson.topic} size="100%" />
          </div>
        }
      />

      {lesson.sections.map((section, i) => (
        <section key={i} aria-labelledby={`${lesson.id}-s${i}`} className="card space-y-4 p-5 sm:p-6">
          <h2 id={`${lesson.id}-s${i}`} className="text-2xl font-extrabold">
            {section.heading[locale]}
          </h2>
          <MiniMarkdown source={section.body[locale]} />
          {section.table && (
            <GrammarTable table={section.table} glossary={glossary} locale={locale} caption={section.heading[locale]} />
          )}
        </section>
      ))}

      <section aria-labelledby={`${lesson.id}-examples`} className="card space-y-4 p-5 sm:p-6">
        <h2 id={`${lesson.id}-examples`} className="text-2xl font-extrabold">
          {t("examples")}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lesson.examples.map((ex) => (
            <Example key={ex.de} {...ex} locale={locale} />
          ))}
        </ul>
      </section>

      {lesson.topic === "word-order" && (
        <Link href="/sentences" className="card flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
          <span className="font-extrabold">{t("toSentences")}</span>
          <span aria-hidden="true" className="text-2xl rtl:-scale-x-100">→</span>
        </Link>
      )}

      <section id="practice" tabIndex={-1} aria-labelledby={`${lesson.id}-practice`} className="scroll-target space-y-4">
        <div>
          <h2 id={`${lesson.id}-practice`} className="text-2xl font-extrabold">
            {t("practiceTitle")}
          </h2>
          <p className="text-sm text-text-muted">{t("practiceIntro")}</p>
        </div>
        <GrammarExerciseRunner lessonId={lesson.id} exercises={exercises} />
      </section>

      <nav aria-label={t("lessonsList")} className="flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link href={`/grammar/${prev.id}`} className="btn btn-secondary">
            <span aria-hidden="true" className="rtl:-scale-x-100">←</span> {t("prevLesson")}: {prev.title[locale]}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/grammar/${next.id}`} className="btn btn-secondary">
            {t("nextLesson")}: {next.title[locale]} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
