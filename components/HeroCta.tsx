"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useHomeProgress } from "./useHomeProgress";

// Fixed size, so the skeleton and the real button occupy exactly the same box.
const BOX = "btn btn-primary h-14 w-full max-w-xs px-6 text-lg";
// The hint under the button: room for two lines is kept from the start, so nothing below moves when it fills in.
const HINT = "min-h-10 max-w-xs text-sm text-text-muted";

/**
 * Hero call to action: the next step of the learning path (from saved progress), not a fixed link.
 * Under it, what finishes that step, so it is clear why the button points there and how to move on.
 */
export default function HeroCta() {
  const t = useTranslations("Path");
  const { ready, nextStep } = useHomeProgress();

  if (!ready) {
    return (
      <>
        <span data-hero-cta aria-busy="true" className={BOX + " animate-pulse opacity-60 hover:translate-y-0"}>
          <span className="sr-only">{t("loading")}</span>
        </span>
        <p aria-hidden="true" className={HINT} />
      </>
    );
  }
  return (
    <>
      <Link data-hero-cta href={nextStep.href} className={BOX}>
        <span className="truncate">{t("heroNext", { step: t(`steps.${nextStep.id}.title`) })}</span>
        <span aria-hidden="true" className="rtl:-scale-x-100">
          →
        </span>
      </Link>
      <p data-hero-hint className={HINT}>
        {t(`steps.${nextStep.id}.desc`)}
      </p>
    </>
  );
}
