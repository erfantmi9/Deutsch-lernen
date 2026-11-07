import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import HeroCta from "@/components/HeroCta";
import Mascot from "@/components/illustrations/Mascot";
import HeroFeatures from "@/components/HeroFeatures";
import HomePath from "@/components/HomePath";
import HomeStudy from "@/components/HomeStudy";
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
    <div className="space-y-12">
      <section className="grid items-center gap-8 py-6 md:grid-cols-2">
        <div className="space-y-5 text-center md:text-start">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto max-w-md text-lg text-text-muted md:mx-0">{t("subtitle")}</p>
          <div className="flex flex-col items-center gap-2 md:items-start">
            <HeroCta />
            <p className="text-sm text-text-muted">{t("hero.free")}</p>
          </div>
        </div>
        {/* The mascot stands on the top edge of the feature grid. */}
        <div className="relative pt-[96px]">
          <Mascot mood="waving" size={120} className="absolute end-4 top-0" />
          <HeroFeatures />
        </div>
      </section>

      <HomePath />

      <ModuleCards grammarTotal={grammarExercises.length} dialogueTotal={dialogues.length} readingTotal={readingTexts.length} />

      <HomeStudy />
    </div>
  );
}
