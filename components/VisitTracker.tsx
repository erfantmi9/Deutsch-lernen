"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/navigation";
import { resumeSection } from "@/lib/learningPath";
import { ensureLearnHydrated, useLearnStore } from "@/stores/learnStore";

/** Remembers the last learning page so the home page can offer "continue where you left off". Renders nothing. */
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (resumeSection(pathname) === null) return;
    void ensureLearnHydrated().then(() => useLearnStore.getState().setLastVisit(pathname));
  }, [pathname]);
  return null;
}
