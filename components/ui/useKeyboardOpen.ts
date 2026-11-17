"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether the on-screen keyboard is open, derived from the visual viewport.
 *
 * Why: on iOS Safari (and Android Chrome in its default "resizes-visual" mode) the keyboard overlays the page without
 * resizing the layout viewport, so `position: fixed; bottom: 0` ends up underneath it. The visual viewport does
 * shrink, so the part of the layout viewport it no longer covers is the keyboard:
 *
 *     inset = innerHeight - (visualViewport.offsetTop + visualViewport.height)
 *
 * `offsetTop` matters because iOS pans the visual viewport inside the layout viewport while the keyboard is open.
 *
 * Two channels, on purpose:
 * - The PIXEL inset goes to CSS only (`--keyboard-inset`, written at most once per animation frame), so fixed bars
 *   (`bottom: var(--keyboard-inset)`) follow the keyboard. It changes on every frame of the keyboard animation and on
 *   every iOS pan; pushing each of those through React re-rendered the drill and re-ran its scroll-into-view, whose
 *   scroll panned the viewport again: a feedback loop that made typing on phones unusable.
 * - React and `html[data-keyboard]` (`.kb-hide` etc.) only get the OPEN / CLOSED state, committed once it has held for
 *   a moment (the keyboard has finished animating), so layout changes and scrolls happen once per open / close.
 *
 * One shared store: any number of components may call the hook; listeners are attached once.
 */

/** Smaller insets are browser chrome (URL / tool bar collapsing and expanding), not a keyboard. */
const KEYBOARD_MIN_PX = 120;
/** iOS sometimes leaves visualViewport.offsetTop stale (or fires no event) when the keyboard closes: re-measure after blur. */
const REMEASURE_AFTER_BLUR_MS = 300;
/** Above this the user is pinch-zooming: the visual viewport shrinks for that reason, not because of a keyboard. */
const MAX_UNZOOMED_SCALE = 1.01;
/** An open / closed change must hold this long before React and the layout react (keyboard animation is ~250ms). */
const SETTLE_MS = 150;

let open = false;
const subscribers = new Set<() => void>();
let detach: (() => void) | null = null;

/** Pure, exported for tests: the inset for a given viewport state. */
export function computeKeyboardInset(v: { innerHeight: number; height: number; offsetTop: number; scale: number }): number {
  if (v.scale > MAX_UNZOOMED_SCALE) return 0; // pinch zoom
  const covered = Math.round(v.innerHeight - v.height - v.offsetTop);
  return covered >= KEYBOARD_MIN_PX ? covered : 0;
}

function attach() {
  const vv = window.visualViewport;
  if (!vv) return;
  const root = document.documentElement;
  let inset = -1;
  let frame = 0;
  let settleTimer = 0;
  let blurTimer = 0;

  const commitOpen = (next: boolean) => {
    if (next === open) return;
    open = next;
    if (open) root.dataset.keyboard = "";
    else delete root.dataset.keyboard;
    subscribers.forEach((notify) => notify());
  };

  const measure = () => {
    frame = 0;
    const next = computeKeyboardInset({ innerHeight: window.innerHeight, height: vv.height, offsetTop: vv.offsetTop, scale: vv.scale });
    if (next !== inset) {
      inset = next;
      root.style.setProperty("--keyboard-inset", `${next}px`);
    }
    const nextOpen = next > 0;
    window.clearTimeout(settleTimer);
    if (nextOpen !== open) settleTimer = window.setTimeout(() => commitOpen(nextOpen), SETTLE_MS);
  };
  // Coalesce bursts of resize / scroll events into one measurement per frame.
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(measure);
  };

  measure();
  const onFocusOut = () => {
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(schedule, REMEASURE_AFTER_BLUR_MS);
  };
  vv.addEventListener("resize", schedule);
  vv.addEventListener("scroll", schedule); // iOS pans the visual viewport (offsetTop) while the keyboard is open
  document.addEventListener("focusout", onFocusOut);
  detach = () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(settleTimer);
    window.clearTimeout(blurTimer);
    document.removeEventListener("focusout", onFocusOut);
    vv.removeEventListener("resize", schedule);
    vv.removeEventListener("scroll", schedule);
    open = false;
    root.style.removeProperty("--keyboard-inset");
    delete root.dataset.keyboard;
  };
}

function subscribe(notify: () => void) {
  if (subscribers.size === 0) attach();
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
    if (subscribers.size === 0) {
      detach?.();
      detach = null;
    }
  };
}

/** True while the on-screen keyboard is open (settled state; the pixel height lives in CSS as --keyboard-inset). */
export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(subscribe, () => open, () => false);
}
