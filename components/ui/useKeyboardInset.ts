"use client";

import { useEffect, useState } from "react";

/** Below this the viewport change is browser chrome (URL bar collapsing), not an on-screen keyboard. */
const KEYBOARD_MIN_PX = 120;

/**
 * Height (px) of the on-screen keyboard, 0 when closed. Also mirrors it into the `--keyboard-inset` CSS variable.
 *
 * Why: on iOS Safari (and Android Chrome with its default "resizes-visual" mode) the keyboard overlays the page
 * WITHOUT resizing the layout viewport, so `position: fixed; bottom: 0` ends up underneath it. The visual viewport
 * does shrink, so the gap between the layout viewport's bottom and the visual viewport's bottom is the covered area.
 * `bottom: var(--keyboard-inset)` then keeps a fixed bar just above the keyboard.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const covered = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      const next = covered >= KEYBOARD_MIN_PX ? covered : 0;
      setInset(next);
      root.style.setProperty("--keyboard-inset", `${next}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update); // iOS pans the visual viewport while the keyboard is open
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--keyboard-inset");
    };
  }, []);

  return inset;
}
