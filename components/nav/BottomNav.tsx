"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isActivePath } from "./navItems";

/** Mobile bottom navigation: 4 icon tabs with tiny labels (colour is never the only signal). */
export default function BottomNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("mainNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-lift backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex h-nav max-w-md items-stretch justify-around gap-1 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 rounded-3xl px-1 text-[11px] font-bold transition " +
                  (active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-surface-2")
                }
              >
                <span
                  className={
                    "flex h-7 w-12 items-center justify-center rounded-full transition " +
                    (active ? "bg-primary text-on-primary" : "")
                  }
                >
                  {item.icon}
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
