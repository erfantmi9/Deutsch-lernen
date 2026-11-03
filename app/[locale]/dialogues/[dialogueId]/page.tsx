import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import DialogueView from "@/components/DialogueView";
import {
  annotateLines,
  dialogueDistractors,
  dialogues,
  getDialogue,
  getDialogueNeighbours,
  resolveVocabIds,
} from "@/lib/dialogues";
import { getLesson } from "@/lib/grammar";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => dialogues.map((d) => ({ locale, dialogueId: d.id })));
}

type Props = { params: Promise<{ locale: string; dialogueId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, dialogueId } = await params;
  const d = getDialogue(dialogueId);
  if (!d) return {};
  const l = locale as "en" | "fa" | "de";
  return { title: `${d.title[l]} – Deutsch Lernen`, description: d.setting[l], alternates: pageAlternates(locale, `/dialogues/${dialogueId}`) };
}

export default async function DialoguePage({ params }: Props) {
  const { locale, dialogueId } = await params;
  setRequestLocale(locale);

  const dialogue = getDialogue(dialogueId);
  if (!dialogue) notFound();

  const { prev, next } = getDialogueNeighbours(dialogue.id);
  const link = (d: typeof prev) => (d ? { id: d.id, title: d.title } : null);
  const lessons = (dialogue.grammarLessonIds ?? []).flatMap((id) => {
    const l = getLesson(id);
    return l ? [{ id: l.id, title: l.title }] : [];
  });

  return (
    <DialogueView
      dialogue={dialogue}
      annotated={annotateLines(dialogue)}
      pool={dialogueDistractors(dialogue)}
      words={resolveVocabIds(dialogue.vocabIds)}
      lessons={lessons}
      prev={link(prev)}
      next={link(next)}
    />
  );
}
