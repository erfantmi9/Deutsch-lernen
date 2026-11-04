"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { GroupKey, NavLeaf } from "./navItems";
import { ICONS, isActivePath, isGroupActive } from "./navItems";

/**
 * A button that opens a short list of links (a disclosure, not an ARIA menu: links stay in the tab order).
 * Closes on Escape (focus returns to the button), on a click outside and when the page changes.
 */
export default function NavMenu({
  groupKey,
  label,
  items,
  placement,
  trigger,
}: {
  groupKey: GroupKey;
  label: string;
  items: readonly NavLeaf[];
  /** Where the list opens: below the button (desktop header) or above it (mobile bottom bar). */
  placement: "below" | "above";
  /** Renders the button's content; `active` is true when the current page is inside this group. */
  trigger: (active: boolean, open: boolean) => ReactNode;
}) {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const active = isGroupActive(pathname, items);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative h-full" data-group={groupKey}>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="true"
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
        className="h-full w-full"
      >
        {trigger(active, open)}
      </button>
      <ul
        id={listId}
        hidden={!open}
        className={
          "absolute z-50 min-w-[13rem] space-y-1 rounded-3xl border border-border bg-surface p-2 shadow-lift " +
          (placement === "below"
            ? (groupKey === "more" ? "end-0" : "start-0") + " top-full mt-2"
            : groupKey === "learn"
              ? "bottom-full start-0 mb-3"
              : "bottom-full start-1/2 mb-3 -translate-x-1/2 rtl:translate-x-1/2")
        }
      >
        {items.map((item) => {
          const current = isActivePath(pathname, item.href);
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={
                  "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-full px-4 text-sm font-bold transition " +
                  (current ? "bg-primary text-on-primary" : "text-text hover:bg-surface-2")
                }
              >
                <span className="[&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const Chevron = ({ open }: { open: boolean }) => (
  <span aria-hidden="true" className={"transition-transform [&>svg]:h-4 [&>svg]:w-4 " + (open ? "rotate-180" : "")}>
    {ICONS.chevron}
  </span>
);
