import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Feature = { key: "articles" | "verbs" | "grammar" | "dialogues" | "reading" | "exam"; href: string; sample: ReactNode };

// The samples are German in every language: they show what the learner will actually practise.
const FEATURES: readonly Feature[] = [
  {
    key: "articles",
    href: "/arcade",
    sample: (
      <>
        <span className="text-der">der</span> · <span className="text-die">die</span> · <span className="text-das">das</span>
      </>
    ),
  },
  { key: "verbs", href: "/verbs", sample: "sein → ich bin" },
  { key: "grammar", href: "/grammar", sample: "mit dem Freund" },
  { key: "dialogues", href: "/dialogues", sample: "Ein Kaffee, bitte!" },
  { key: "reading", href: "/reading", sample: "Lies und verstehe." },
  { key: "exam", href: "/exam", sample: "A1 ✓" },
];

/** Hero visual: what the app covers, one real example per area. Every card is a link into that area. */
export default function HeroFeatures() {
  const t = useTranslations("Home.hero.features");
  return (
    <ul data-hero-features aria-label={t("label")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2">
      {FEATURES.map((f) => (
        <li key={f.key}>
          <Link
            href={f.href}
            className="card flex h-full flex-col gap-1 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="text-sm font-bold text-text-muted">{t(`${f.key}`)}</span>
            <span lang="de" dir="ltr" className="self-start text-lg font-extrabold leading-snug">
              {f.sample}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
