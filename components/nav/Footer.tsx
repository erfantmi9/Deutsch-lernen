import { getTranslations } from "next-intl/server";

/** Last thing inside <main>, so <main>'s bottom padding (room for the bottom nav) still applies below it. */
export default async function Footer({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  return (
    <footer className="mt-16 text-center text-xs text-text-muted">
      <a href={`/${locale}/privacy`} className="underline underline-offset-2 hover:text-text">
        {t("privacy")}
      </a>
    </footer>
  );
}
