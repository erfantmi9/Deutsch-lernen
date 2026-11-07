import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import HeroCta from "@/components/HeroCta";
import HeroHome from "@/components/illustrations/HeroHome";
import { Blob, Sparkle } from "@/components/illustrations/shapes";
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
      <section className="relative grid items-center gap-8 overflow-hidden py-6 md:grid-cols-2">
        <Blob tone="surface-2" size={240} className="pointer-events-none absolute -bottom-20 start-[-4rem] -z-10" />
        <Sparkle tone="yellow" size={36} className="pointer-events-none absolute end-4 top-2 motion-safe:animate-wiggle" />
        <div className="space-y-5 text-center md:text-start">
          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto max-w-md text-lg text-text-muted md:mx-0">{t("subtitle")}</p>
          <HeroCta />
        </div>
        <HeroHome />
      </section>

      <HomePath />

      <ModuleCards grammarTotal={grammarExercises.length} dialogueTotal={dialogues.length} readingTotal={readingTexts.length} />

      <HomeStudy />
    </div>
  );
}
