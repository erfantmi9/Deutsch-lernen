import { ImageResponse } from "next/og";
import { routing } from "@/i18n/routing";
import { SITE_NAME, THEME_COLOR } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// The default image font has no Persian glyphs, so the card uses Latin text in every language.
const TAGLINE: Record<string, string> = {
  en: "Learn German A1: der, die, das, verbs, grammar and more",
  de: "Deutsch lernen A1: Artikel, Verben, Grammatik und mehr",
  fa: "German A1 · der, die, das · EN / FA / DE",
};

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#ffffff",
          color: "#1f2937",
          borderLeft: `24px solid ${THEME_COLOR}`,
        }}
      >
        <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
          <div style={{ display: "flex", padding: "10px 28px", borderRadius: 999, background: "#dbe8fc", color: "#1a73e8", fontSize: 44, fontWeight: 800 }}>der</div>
          <div style={{ display: "flex", padding: "10px 28px", borderRadius: 999, background: "#fde0dd", color: "#ea4335", fontSize: 44, fontWeight: 800 }}>die</div>
          <div style={{ display: "flex", padding: "10px 28px", borderRadius: 999, background: "#d8f0de", color: "#34a853", fontSize: 44, fontWeight: 800 }}>das</div>
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>{SITE_NAME}</div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#4b5563" }}>{TAGLINE[locale] ?? TAGLINE.en}</div>
      </div>
    ),
    size,
  );
}
