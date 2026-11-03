"use client";

import { useTranslations } from "next-intl";
import type { SentenceRole } from "@/types/sentence";
import { ROLE_STYLE, ROLE_SWATCH } from "./roleStyles";

/** Legend for sentence-part colours. Every entry has a text label, so colour is never the only signal. */
export default function RoleLegend({ roles }: { roles: readonly SentenceRole[] }) {
  const t = useTranslations("Sentences");
  const unique = Array.from(new Set(roles));
  if (unique.length === 0) return null;

  return (
    <div role="group" aria-label={t("legend")} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-bold text-text-muted">{t("legend")}:</span>
      {unique.map((r) => (
        <span key={r} className={"inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 font-bold " + ROLE_STYLE[r]}>
          <span aria-hidden="true" className={"h-2.5 w-2.5 rounded-full " + ROLE_SWATCH[r]} />
          {t(`roles.${r}`)}
        </span>
      ))}
    </div>
  );
}
