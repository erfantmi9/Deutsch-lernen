import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import ArticleQuiz from "@/components/ArticleQuiz";
import PageHeader from "@/components/PageHeader";
import ArcadeHeader from "@/components/illustrations/headers/ArcadeHeader";

export default async function ArcadePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Arcade />;
}

function Arcade() {
  const t = useTranslations("Arcade");
  return (
    <div className="mx-auto w-full max-w-xl space-y-4 sm:space-y-6">
      <PageHeader compact title={t("title")} subtitle={t("subtitle")} illustration={<ArcadeHeader size="100%" />} />
      <ArticleQuiz />
    </div>
  );
}
