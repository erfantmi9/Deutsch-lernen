"use client";

import { useSyncExternalStore } from "react";

/**
 * On-screen keyboard height in px (0 = closed), derived from the visual viewport.
 *
 * Why: on iOS Safari (and Android Chrome in its default "resizes-visual" mode) the keyboard overlays the page without
 * resizing the layout viewport, so `position: fixed; bottom: 0` ends up underneath it. The visual viewport does
 * shrink, so the part of the layout viewport it no longer covers is the keyboard:
 *
 *     inset = innerHeight - (visualViewport.offsetTop + visualViewport.height)
 *
 * `offsetTop` matters because iOS pans the visual viewport inside the layout viewport while the keyboard is open.
 *
 * Mirrors the value into `--keyboard-inset` and sets `html[data-keyboard]` while it is open, so CSS alone can react
 * (fixed bars use `bottom: var(--keyboard-inset)`, `.kb-hide` collapses decoration).
 *
 * One shared store: any number of components may call the hook; listeners are attached once.
 */

/** Smaller insets are browser chrome (URL / tool bar collapsing and expanding), not a keyboard. */
const KEYBOARD_MIN_PX = 120;
/** iOS sometimes leaves visualViewport.offsetTop stale (or fires no event) when the keyboard closes: re-measure after blur. */
const REMEASURE_AFTER_BLUR_MS = 300;
/** Above this the user is pinch-zooming: the visual viewport shrinks for that reason, not because of a keyboard. */
const MAX_UNZOOMED_SCALE = 1.01;

let inset = 0;
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
  const update = () => {
    const next = computeKeyboardInset({ innerHeight: window.innerHeight, height: vv.height, offsetTop: vv.offsetTop, scale: vv.scale });
    if (next === inset) return;
    inset = next;
    root.style.setProperty("--keyboard-inset", `${next}px`);
    if (next > 0) root.dataset.keyboard = "";
    else delete root.dataset.keyboard;
    subscribers.forEach((notify) => notify());
  };
  update();
  let blurTimer = 0;
  const onFocusOut = () => {
    window.clearTimeout(blurTimer);
    blurTimer = window.setTimeout(update, REMEASURE_AFTER_BLUR_MS);
  };
  vv.addEventListener("resize", update);
  vv.addEventListener("scroll", update); // iOS pans the visual viewport (offsetTop) while the keyboard is open
  document.addEventListener("focusout", onFocusOut);
  detach = () => {
    window.clearTimeout(blurTimer);
    document.removeEventListener("focusout", onFocusOut);
    vv.removeEventListener("resize", update);
    vv.removeEventListener("scroll", update);
    inset = 0;
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

export function useKeyboardInset(): number {
  return useSyncExternalStore(subscribe, () => inset, () => 0);
}
