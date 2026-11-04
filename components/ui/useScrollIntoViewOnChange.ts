"use client";

import { useEffect, useRef } from "react";

interface Options {
  /** Skip scrolling while false (e.g. only when a selection exists). */
  enabled?: boolean;
  /** Move focus to the target (it gets tabIndex=-1). Default true. */
  focus?: boolean;
  /** Don't react to the initial mount. Default true. */
  skipFirst?: boolean;
  /** Vertical alignment: "start" (default) puts the target at the top, "nearest" scrolls the minimum needed. */
  block?: ScrollLogicalPosition;
}

/** True when the element sits fully between the sticky header and whatever is fixed at the bottom. */
function isComfortablyVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  const top = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
  // Highest visible fixed-bottom element (bottom nav or action bar; the hidden one has display:none).
  const bottom = Math.min(
    window.innerHeight,
    ...[...document.querySelectorAll("[data-bottom-chrome]")]
      .filter((c) => getComputedStyle(c).display !== "none")
      .map((c) => c.getBoundingClientRect().top),
  );
  return r.top >= top && r.bottom <= bottom;
}

/**
 * Fallback when a layout can't show the result in place: whenever `trigger` changes, scroll the returned ref's
 * element into view and move focus to it. Smooth unless the user prefers reduced motion. Offsets come from the
 * .scroll-target class (scroll-margin uses --header-h and --bottom-chrome-h). No scroll if already fully visible.
 */
export function useScrollIntoViewOnChange<T extends HTMLElement = HTMLElement>(trigger: unknown, opts: Options = {}) {
  const { enabled = true, focus = true, skipFirst = true, block = "start" } = opts;
  const ref = useRef<T>(null);
  const first = useRef(true);

  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    if ((skipFirst && isFirst) || !enabled) return;
    const el = ref.current;
    if (!el) return;
    el.classList.add("scroll-target");
    if (!el.hasAttribute("tabindex")) el.tabIndex = -1;
    if (!isComfortablyVisible(el)) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block });
    }
    if (focus) el.focus({ preventScroll: true });
  }, [trigger, enabled, focus, skipFirst, block]);

  return ref;
}
