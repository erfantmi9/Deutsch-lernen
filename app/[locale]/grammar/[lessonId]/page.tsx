import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import LessonView from "@/components/LessonView";
import { getLesson, getLessonExercises, getNeighbours, glossary, grammarLessons } from "@/lib/grammar";
import type { Locale } from "@/lib/grammarText";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => grammarLessons.map((l) => ({ locale, lessonId: l.id })));
}

type Props = { params: Promise<{ locale: string; lessonId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) return {};
  const l = locale as Locale;
  return { title: `${lesson.title[l]} – Deutsch Lernen`, description: lesson.summary[l], alternates: pageAlternates(locale, `/grammar/${lessonId}`) };
}

export default async function GrammarLessonPage({ params }: Props) {
  const { locale, lessonId } = await params;
  setRequestLocale(locale);

  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  const { prev, next } = getNeighbours(lesson.id);
  const link = (l: typeof prev) => (l ? { id: l.id, title: l.title } : null);

  return (
    <LessonView
      lesson={lesson}
      exercises={getLessonExercises(lesson)}
      glossary={[...glossary]}
      prev={link(prev)}
      next={link(next)}
    />
  );
}
