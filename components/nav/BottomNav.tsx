"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import NavMenu from "./NavMenu";
import { NAV_ENTRIES, isActivePath } from "./navItems";

const tab = "flex h-full min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-3xl px-1 text-[11px] font-bold transition ";
const bubble = (active: boolean): string =>
  "flex h-7 w-12 items-center justify-center rounded-full transition " + (active ? "bg-primary text-on-primary" : "");

/** Mobile bottom navigation: six icon tabs with tiny labels; the three groups open a short list above the bar. */
export default function BottomNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("mainNav")}
      data-bottom-chrome
      className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[var(--safe-bottom)] shadow-lift backdrop-blur lg:hidden"
    >
      <ul className="mx-auto flex h-nav max-w-md items-stretch justify-around gap-0.5 px-1 py-2">
        {NAV_ENTRIES.map((entry) => {
          if (entry.type === "link") {
            const active = isActivePath(pathname, entry.item.href);
            return (
              <li key={entry.item.key} className="flex-1">
                <Link
                  href={entry.item.href}
                  aria-current={active ? "page" : undefined}
                  className={tab + (active ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-surface-2")}
                >
                  <span className={bubble(active)}>{entry.item.icon}</span>
                  {t(entry.item.key)}
                </Link>
              </li>
            );
          }
          return (
            <li key={entry.key} className="flex-1">
              <NavMenu
                groupKey={entry.key}
                label={t(entry.key === "read" ? "read" : entry.key)}
                items={entry.items}
                placement="above"
                trigger={(active, open) => (
                  <span className={tab + (active || open ? "bg-primary-soft text-primary" : "text-text-muted hover:bg-surface-2")}>
                    <span className={bubble(active)}>{entry.icon}</span>
                    {t(entry.key === "read" ? "readShort" : entry.key)}
                  </span>
                )}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
