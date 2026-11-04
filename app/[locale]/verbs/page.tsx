import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import VerbsExplorer from "@/components/VerbsExplorer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function VerbsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // VerbsExplorer reads ?type= / ?practice= via useSearchParams, which needs a Suspense boundary on static pages.
  return (
    <Suspense>
      <VerbsExplorer />
    </Suspense>
  );
}
