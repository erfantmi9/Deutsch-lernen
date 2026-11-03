"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { en: "EN", fa: "فا", de: "DE" };
const NAMES: Record<string, string> = { en: "English", fa: "فارسی", de: "Deutsch" };

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t("language")}: ${NAMES[locale]}`}
        className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-bold text-text shadow-soft transition hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-lift active:translate-y-0"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
        </svg>
        <span lang={locale}>{LABELS[locale]}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={open ? "rotate-180 transition" : "transition"}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          aria-label={t("language")}
          className="absolute end-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-3xl border border-border bg-surface p-1.5 shadow-lift"
        >
          {routing.locales.map((l) => {
            const active = l === locale;
            return (
              <li key={l}>
                <Link
                  href={pathname}
                  locale={l}
                  hrefLang={l}
                  lang={l}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "true" : undefined}
                  className={
                    "flex min-h-11 items-center justify-between gap-2 rounded-full px-4 text-sm font-bold transition " +
                    (active ? "bg-primary-soft text-primary" : "text-text hover:bg-surface-2")
                  }
                >
                  <span>{NAMES[l]}</span>
                  {active && (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
