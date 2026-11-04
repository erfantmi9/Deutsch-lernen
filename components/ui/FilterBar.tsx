"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Sticky filter bar with a "Showing N items" live region (always mounted, only the text changes).
 * Sticks directly under the header, so the filters and the count stay in view while the list scrolls.
 */
export default function FilterBar({ children, count, label }: { children: ReactNode; count: number; label?: string }) {
  const t = useTranslations("Ui");
  return (
    <div className="sticky top-header z-20 -mx-4 space-y-2 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur">
      {children}
      <p role="status" aria-live="polite" className="text-sm text-text-muted">
        {label ?? t("showing", { count })}
      </p>
    </div>
  );
}
