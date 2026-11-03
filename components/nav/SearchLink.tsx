"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ICONS } from "./navItems";

/** Round search button for the header. */
export default function SearchLink() {
  const t = useTranslations("Nav");
  const active = usePathname() === "/search";
  return (
    <Link
      href="/search"
      aria-label={t("search")}
      title={t("search")}
      aria-current={active ? "page" : undefined}
      className={
        "flex size-11 items-center justify-center rounded-full border border-border shadow-soft transition hover:bg-surface-2 " +
        (active ? "bg-primary text-on-primary" : "bg-surface text-text-muted")
      }
    >
      {ICONS.search}
    </Link>
  );
}
