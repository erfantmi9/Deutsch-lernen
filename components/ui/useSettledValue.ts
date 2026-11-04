"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The value once it has stopped changing for `delay` ms (a slider drag, held arrow key, taps on dates).
 * Starts as `initial` (default "") and ignores the first render, so nothing is announced on mount.
 * Feed it into a live region to announce only the final value of a change, never every step.
 */
export function useSettledValue<T>(value: T, delay = 600, initial?: T): T | undefined {
  const [settled, setSettled] = useState<T | undefined>(initial);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return settled;
}
