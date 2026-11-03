import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Nunito, Vazirmatn } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, RTL_LOCALES } from "@/i18n/routing";
import Header from "@/components/nav/Header";
import BottomNav from "@/components/nav/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import VisitTracker from "@/components/VisitTracker";
import { SITE_NAME, siteUrl, THEME_COLOR } from "@/lib/site";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/theme/ThemeProvider";
import "../globals.css";

const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap" });
const vazir = Vazirmatn({ subsets: ["arabic", "latin"], variable: "--font-vazir", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    metadataBase: new URL(siteUrl()),
    title: t("title"),
    description: t("description"),
    applicationName: SITE_NAME,
    manifest: "/manifest.webmanifest",
    icons: { icon: "/icon.svg", apple: "/icon-192.png" },
    openGraph: { type: "website", siteName: SITE_NAME, title: t("title"), description: t("description"), locale },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
    appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: THEME_COLOR, width: "device-width", initialScale: 1 };

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const tNav = await getTranslations({ locale, namespace: "Nav" });
  const dir = (RTL_LOCALES as readonly string[]).includes(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${nunito.variable} ${vazir.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={locale === "fa" ? "font-vazir" : "font-sans"}>
        <NextIntlClientProvider>
          <ThemeProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-5 focus:py-3 focus:font-extrabold focus:text-on-primary"
            >
              {tNav("skipToContent")}
            </a>
            <Header />
            <main id="main" tabIndex={-1} className="mx-auto w-full max-w-4xl px-4 pb-28 pt-6 outline-none lg:pb-16">
              {children}
            </main>
            <BottomNav />
            <VisitTracker />
            <RegisterSW />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
