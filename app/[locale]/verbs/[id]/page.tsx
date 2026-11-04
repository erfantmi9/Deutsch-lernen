import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";
import { getVerb, verbs } from "@/lib/verbs";
import VerbDetail from "@/components/VerbDetail";
import VerbTable from "@/components/VerbTable";

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

  // VerbDetail reads ?type= (list filter) on the client; the static HTML already contains the full table.
  return (
    <Suspense fallback={<VerbTable verb={verb} />}>
      <VerbDetail verb={verb} />
    </Suspense>
  );
}
