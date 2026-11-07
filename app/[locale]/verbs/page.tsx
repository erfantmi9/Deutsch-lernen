import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import VerbsExplorer, { VerbsExplorerView } from "@/components/VerbsExplorer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function VerbsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // VerbsExplorer reads ?type= / ?practice= via useSearchParams, which renders on the client only up to this boundary.
  // The fallback (the unfiltered list) is what the static HTML contains.
  return (
    <Suspense fallback={<VerbsExplorerView type={null} practicing={false} />}>
      <VerbsExplorer />
    </Suspense>
  );
}
