"use client";

import { useEffect, useState } from "react";
import type { SrsCard } from "@/lib/srs";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";

/** The review deck once it has loaded on the client; null before (server render and first paint). */
export function useDeck(): Readonly<Record<string, SrsCard>> | null {
  const [ready, setReady] = useState(false);
  const cards = useSrsStore((s) => s.cards);
  useEffect(() => {
    let cancelled = false;
    void ensureSrsHydrated().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready ? cards : null;
}
