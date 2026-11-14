import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { dialogues, getDialogue } from "@/lib/dialogues";
import DialogueListen from "@/components/listen/DialogueListen";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => dialogues.map((d) => ({ locale, dialogueId: d.id })));
}

type Props = { params: Promise<{ locale: string; dialogueId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, dialogueId } = await params;
  const d = getDialogue(dialogueId);
  if (!d) return {};
  const t = await getTranslations({ locale, namespace: "Listen.dialogues" });
  const l = locale as "en" | "fa" | "de";
  return {
    title: `${t("pageTitle", { title: d.title[l] })} – Deutsch Lernen`,
    description: d.setting[l],
    alternates: pageAlternates(locale, `/listen/dialogues/${dialogueId}`),
  };
}

export default async function ListenDialoguePage({ params }: Props) {
  const { locale, dialogueId } = await params;
  setRequestLocale(locale);
  const dialogue = getDialogue(dialogueId);
  if (!dialogue) notFound();
  return <DialogueListen dialogue={dialogue} />;
}
