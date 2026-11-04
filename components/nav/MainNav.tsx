"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import NavMenu, { Chevron } from "./NavMenu";
import { NAV_ENTRIES, isActivePath } from "./navItems";

const pill = (active: boolean): string =>
  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-bold transition xl:px-4 " +
  (active ? "bg-primary text-on-primary shadow-soft" : "text-text-muted hover:bg-surface-2 hover:text-text");

/** Desktop pill navigation (hidden on mobile, where BottomNav takes over). */
export default function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("mainNav")} className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-soft lg:flex">
      {NAV_ENTRIES.map((entry) =>
        entry.type === "link" ? (
          <Link
            key={entry.item.key}
            href={entry.item.href}
            aria-current={isActivePath(pathname, entry.item.href) ? "page" : undefined}
            className={pill(isActivePath(pathname, entry.item.href))}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{entry.item.icon}</span>
            {/* Icon-only between lg and xl so the pill nav never overflows the header; the name stays for screen readers. */}
            <span className="max-xl:sr-only">{t(entry.item.key)}</span>
          </Link>
        ) : (
          <NavMenu
            key={entry.key}
            groupKey={entry.key}
            label={t(entry.key)}
            items={entry.items}
            placement="below"
            trigger={(active, open) => (
              <span className={pill(active)}>
                <span className="[&>svg]:h-5 [&>svg]:w-5">{entry.icon}</span>
                <span className="max-xl:sr-only">{t(entry.key)}</span>
                <Chevron open={open} />
              </span>
            )}
          />
        ),
      )}
    </nav>
  );
}
