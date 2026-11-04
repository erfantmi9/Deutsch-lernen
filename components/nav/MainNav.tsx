"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import NavMenu, { Chevron } from "./NavMenu";
import { HEADER_INLINE_ENTRIES, HEADER_MORE_ITEMS, ICONS, isActivePath } from "./navItems";

const pill = (active: boolean): string =>
  "flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-bold transition " +
  (active ? "bg-primary text-on-primary shadow-soft" : "text-text-muted hover:bg-surface-2 hover:text-text");

/**
 * Desktop pill navigation (hidden on mobile, where BottomNav takes over). Text labels are always visible; the header
 * is as wide as the content column, so the less-used destinations collapse into a "More" menu.
 */
export default function MainNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("mainNav")} className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-soft lg:flex">
      {HEADER_INLINE_ENTRIES.map((entry) =>
        entry.type === "link" ? (
          <Link
            key={entry.item.key}
            href={entry.item.href}
            title={t(entry.item.key)}
            aria-current={isActivePath(pathname, entry.item.href) ? "page" : undefined}
            className={pill(isActivePath(pathname, entry.item.href))}
          >
            <span aria-hidden="true" className="[&>svg]:h-5 [&>svg]:w-5">
              {entry.item.icon}
            </span>
            {t(entry.item.key)}
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
                <span aria-hidden="true" className="[&>svg]:h-5 [&>svg]:w-5">
                  {entry.icon}
                </span>
                {t(entry.key)}
                <Chevron open={open} />
              </span>
            )}
          />
        ),
      )}
      <NavMenu
        groupKey="more"
        label={t("more")}
        items={HEADER_MORE_ITEMS}
        placement="below"
        trigger={(active, open) => (
          <span className={pill(active)}>
            <span aria-hidden="true" className="[&>svg]:h-5 [&>svg]:w-5">
              {ICONS.more}
            </span>
            {t("more")}
            <Chevron open={open} />
          </span>
        )}
      />
    </nav>
  );
}
