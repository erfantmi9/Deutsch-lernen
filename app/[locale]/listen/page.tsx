import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { dialogues } from "@/lib/dialogues";
import { dictationPool, listeningMessages } from "@/lib/listening";
import ListenHub from "@/components/listen/ListenHub";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Listen.hub" });
  return { title: `${t("title")} – Deutsch Lernen`, description: t("subtitle"), alternates: pageAlternates(locale, "/listen") };
}

export default async function ListenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pool = dictationPool();
  return (
    <ListenHub
      dictationTotal={pool.length}
      messagesTotal={listeningMessages.length}
      dictationIds={pool.map((s) => s.id)}
      messageIds={listeningMessages.map((m) => m.id)}
      dialogues={dialogues.map((d) => ({ id: d.id, title: d.title, topic: d.topic }))}
    />
  );
}
