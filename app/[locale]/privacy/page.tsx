import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return { title: `${t("title")} – Deutsch Lernen`, alternates: pageAlternates(locale, "/privacy") };
}

type Section = { h: string; p: string[] };

/** Who runs the site and how to reach them. Set on Vercel: NEXT_PUBLIC_OPERATOR_NAME, NEXT_PUBLIC_CONTACT_EMAIL. */
const OPERATOR = process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim();
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Privacy" });
  const sections = t.raw("sections") as Section[];

  return (
    <article className="mx-auto max-w-2xl py-6 leading-relaxed">
      <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-sm text-text-muted">{t("updated")}</p>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-bold">{t("controllerTitle")}</h2>
        <p>
          {OPERATOR ?? t("operatorMissing")}
          {CONTACT && (
            <>
              {" · "}
              <a href={`mailto:${CONTACT}`} className="underline" dir="ltr">
                {CONTACT}
              </a>
            </>
          )}
        </p>
      </section>

      {sections.map((s) => (
        <section key={s.h} className="mb-8">
          <h2 className="mb-2 text-xl font-bold">{s.h}</h2>
          {s.p.map((para) => (
            <p key={para} className="mb-3">
              {para}
            </p>
          ))}
        </section>
      ))}
    </article>
  );
}
