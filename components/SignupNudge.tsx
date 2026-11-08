"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { useActivityStore } from "@/stores/activityStore";
import { useSession } from "@/lib/useSession";

/** Answers needed before the prompt appears: roughly one finished lesson or review session. */
export const NUDGE_AFTER_ANSWERS = 20;
const DISMISS_KEY = "signup-nudge-dismissed"; // outside "deutsch-learner:" so clearing progress keeps it
const HIDDEN_ON = ["/login", "/account", "/forgot-password", "/reset-password", "/privacy"];

function totalAnswers(days: Readonly<Record<string, number>>): number {
  return Object.values(days).reduce((a, b) => a + b, 0);
}

/** Signed-out learners with real progress get one dismissible card suggesting an account. Never blocks practice. */
export default function SignupNudge() {
  const t = useTranslations("Nudge");
  const locale = useLocale();
  const pathname = usePathname();
  const session = useSession();
  const [answers, setAnswers] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      /* storage blocked: stays hidden */
    }
    if (!useActivityStore.persist.hasHydrated()) void useActivityStore.persist.rehydrate();
    setAnswers(totalAnswers(useActivityStore.getState().days));
    return useActivityStore.subscribe((s) => setAnswers(totalAnswers(s.days)));
  }, []);

  if (session !== null || dismissed || answers < NUDGE_AFTER_ANSWERS) return null;
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* hidden for this page load only */
    }
  }

  return (
    <aside
      aria-label={t("label")}
      className="fixed inset-x-4 bottom-[calc(var(--bottom-chrome-h)+0.75rem)] z-20 mx-auto max-w-md rounded-2xl border border-border bg-surface p-4 shadow-lift lg:bottom-[calc(var(--bottom-chrome-h)+1.5rem)]"
    >
      <p className="mb-1 font-bold">{t("title")}</p>
      <p className="mb-3 text-sm text-text-muted">{t("text")}</p>
      <div className="flex flex-wrap gap-2">
        <a href={`/${locale}/login?mode=signup&callbackUrl=${encodeURIComponent(`/${locale}${pathname}`)}`} className="btn btn-primary">
          {t("cta")}
        </a>
        <button type="button" onClick={dismiss} className="btn-ghost">
          {t("later")}
        </button>
      </div>
    </aside>
  );
}
