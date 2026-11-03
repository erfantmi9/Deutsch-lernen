"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV_ITEMS, isActivePath } from "./navItems";

/** Desktop pill navigation (hidden on mobile, where BottomNav takes over). */
export default function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("mainNav")}
      className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-soft lg:flex"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition " +
              (active
                ? "bg-primary text-on-primary shadow-soft"
                : "text-text-muted hover:bg-surface-2 hover:text-text")
            }
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
