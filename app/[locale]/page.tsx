import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import HomePath, { HomeGoal } from "@/components/HomePath";
import TodayCard from "@/components/TodayCard";
import ModuleCards from "@/components/ModuleCards";
import { dialogues } from "@/lib/dialogues";
import { grammarExercises } from "@/lib/grammar";
import { readingTexts } from "@/lib/reading";
import Footer from "@/components/nav/Footer";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Home />
      <Footer locale={locale} />
    </>
  );
}

function Home() {
  const t = useTranslations("Home");
  return (
    <div className="space-y-10">
      <div className="space-y-5 pt-2">
        <header className="space-y-1">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{t("title")}</h1>
          <p className="text-text-muted">{t("subtitle")}</p>
        </header>
        <TodayCard />
      </div>

      <HomePath />

      <HomeGoal />

      <section aria-labelledby="sections-title" className="space-y-4">
        <h2 id="sections-title" className="text-2xl font-extrabold">
          {t("sectionsTitle")}
        </h2>
        <ModuleCards grammarTotal={grammarExercises.length} dialogueTotal={dialogues.length} readingTotal={readingTexts.length} />
      </section>
    </div>
  );
}
