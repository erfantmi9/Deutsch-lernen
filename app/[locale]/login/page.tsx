import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Footer from "@/components/nav/Footer";
import { routing } from "@/i18n/routing";
import LoginForm from "@/components/LoginForm";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Login" });
  return { title: `${t("signInTitle")} – Deutsch Lernen`, robots: { index: false } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <LoginForm googleEnabled={Boolean(process.env.AUTH_GOOGLE_ID)} />
      <Footer locale={locale} />
    </>
  );
}
