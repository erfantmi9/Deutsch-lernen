import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import HeroHome from "@/components/illustrations/HeroHome";
import { Blob, Sparkle } from "@/components/illustrations/shapes";
import ModuleCards from "@/components/ModuleCards";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Home />;
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
          <Link href="/arcade" className="btn btn-primary px-8 py-3 text-lg">
            {t("cta")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </Link>
        </div>
        <HeroHome />
      </section>

      <ModuleCards />
    </div>
  );
}
