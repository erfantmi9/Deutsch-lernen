import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { getVerb, verbs } from "@/lib/verbs";
import VerbDetail from "@/components/VerbDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => verbs.map((v) => ({ locale, id: v.id })));
}

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const verb = getVerb(id);
  if (!verb) return {};
  return {
    title: `${verb.infinitive} – Deutsch Lernen`,
    description: `${verb.infinitive}: ${verb.translations.en}`,
    alternates: pageAlternates(locale, `/verbs/${id}`),
  };
}

export default async function VerbPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const verb = getVerb(id);
  if (!verb) notFound();

  // The whole body is in the static HTML; only VerbDetail's filter-dependent links read ?type= (own Suspense boundaries).
  return <VerbDetail verb={verb} />;
}
