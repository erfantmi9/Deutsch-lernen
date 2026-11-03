import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import SentencesExplorer from "@/components/SentencesExplorer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SentencesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SentencesExplorer />;
}
